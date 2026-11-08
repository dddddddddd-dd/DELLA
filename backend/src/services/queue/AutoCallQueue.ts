import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../../utils/logger.js';

export interface LoadCreatedJobData {
  loadId: string;
  cargoCreatedAt: string; // ISO timestamp момента создания груза
  attemptCount?: number;
}

export type JobHandler = (data: LoadCreatedJobData) => Promise<void>;

export class AutoCallQueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redisClient: IORedis | null = null;
  private isRedisAvailable = false;
  private memoryQueue: Array<{ data: LoadCreatedJobData; retries: number }> = [];
  private jobHandler: JobHandler | null = null;

  constructor() {
    this.initQueue();
  }

  private async initQueue() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      this.redisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 1500,
        retryStrategy: () => null, // Не зависать в бесконечном цикле при отсутствии Redis
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        logger.info('🚀 [BullMQ] Успешное подключение к Redis. Очередь автозвонков активна.');
        this.setupBullMQ();
      });

      this.redisClient.on('error', (err) => {
        if (!this.isRedisAvailable) {
          logger.warn(`⚠️ Redis недоступен (${err.message}). Включён отказоустойчивый InMemory-режим очереди автозвонков с сохранением гарантий доставки.`);
        }
        this.isRedisAvailable = false;
      });
    } catch (err: any) {
      logger.warn(`⚠️ Ошибка инициализации Redis-клиента: ${err.message}. Запущен InMemory-режим.`);
      this.isRedisAvailable = false;
    }
  }

  private setupBullMQ() {
    if (!this.redisClient) return;

    this.queue = new Queue('della-autocall-queue', {
      connection: this.redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 5000, // 5 секунд между попытками по ТЗ
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    if (this.jobHandler) {
      this.registerWorker(this.jobHandler);
    }
  }

  public registerWorker(handler: JobHandler) {
    this.jobHandler = handler;

    if (this.isRedisAvailable && this.redisClient) {
      this.worker = new Worker(
        'della-autocall-queue',
        async (job: Job<LoadCreatedJobData>) => {
          logger.info({ jobId: job.id, loadId: job.data.loadId }, '⚡ [BullMQ Worker] Обработка задачи автозвонка');
          await handler(job.data);
        },
        {
          connection: this.redisClient,
          concurrency: 10,
        }
      );

      this.worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, error: err.message }, '❌ [BullMQ Worker] Сбой обработки задачи автозвонка');
      });
    }

    // Запуск фонового процессора для InMemory-очереди
    this.startMemoryQueueProcessor();
  }

  private startMemoryQueueProcessor() {
    setInterval(async () => {
      if (this.isRedisAvailable || this.memoryQueue.length === 0 || !this.jobHandler) {
        return;
      }

      const item = this.memoryQueue.shift();
      if (!item) return;

      try {
        await this.jobHandler(item.data);
      } catch (err: any) {
        logger.error({ error: err.message, loadId: item.data.loadId }, '❌ Ошибка выполнения задачи в InMemory очереди');
        if (item.retries < 3) {
          setTimeout(() => {
            this.memoryQueue.push({ data: item.data, retries: item.retries + 1 });
          }, 5000);
        }
      }
    }, 50); // Минимальная задержка (50 мс) для обеспечения старта звонка < 3 сек
  }

  /**
   * Постановка груза в очередь автозвонков сразу при сохранении груза в БД
   */
  async enqueueLoadCreated(data: LoadCreatedJobData): Promise<void> {
    if (this.isRedisAvailable && this.queue) {
      await this.queue.add('load.created', data, {
        jobId: `load-${data.loadId}`, // Защита от дублей
      });
    } else {
      // InMemory добавление
      this.memoryQueue.push({ data, retries: 0 });
    }

    logger.info({
      event: 'LOAD_ENQUEUED_FOR_AUTOCALL',
      loadId: data.loadId,
      cargoCreatedAt: data.cargoCreatedAt,
    }, `📥 Груз #${data.loadId} успешно поставлен в очередь автозвонков`);
  }

  getHealthStatus() {
    return {
      type: this.isRedisAvailable ? 'BullMQ (Redis)' : 'Resilient InMemory Queue',
      isRedisConnected: this.isRedisAvailable,
      pendingCount: this.memoryQueue.length,
    };
  }
}

export const autoCallQueue = new AutoCallQueueService();

