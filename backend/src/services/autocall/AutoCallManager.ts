import { prisma } from '../../config/index.js';
import { telephonyService } from '../telephony/TelephonyService.js';
import { FallbackChannelService } from '../notification/FallbackChannelService.js';
import { autoCallQueue, LoadCreatedJobData } from '../queue/AutoCallQueue.js';
import { logger } from '../../utils/logger.js';

export class AutoCallManager {
  private static instance: AutoCallManager;
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Регистрация обработчика очереди
    autoCallQueue.registerWorker(async (data: LoadCreatedJobData) => {
      await this.handleLoadCreated(data);
    });
  }

  public static getInstance(): AutoCallManager {
    if (!AutoCallManager.instance) {
      AutoCallManager.instance = new AutoCallManager();
    }
    return AutoCallManager.instance;
  }

  /**
   * Проверка глобального включения автозвонков
   */
  async isAutoCallGloballyEnabled(): Promise<boolean> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTO_CALL_ENABLED' },
    });
    return setting ? setting.value === 'true' : true;
  }

  /**
   * Проверка ночного времени по часовому поясу Казахстана (Астана, UTC+5)
   * Ночь: с 23:00 до 06:00
   */
  isNightTimeInKazakhstan(): boolean {
    const now = new Date();
    // Смещение UTC+5
    const astanaHours = (now.getUTCHours() + 5) % 24;
    return astanaHours >= 23 || astanaHours < 6;
  }

  /**
   * Проверка спам-лимита: не более N звонков водителю в час
   */
  async canCallDriver(driverId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const maxCalls = parseInt(process.env.MAX_CALLS_PER_DRIVER_HOUR || '3', 10);

    const recentCallsCount = await prisma.callAttempt.count({
      where: {
        driverId,
        createdAt: { gte: oneHourAgo },
      },
    });

    return recentCallsCount < maxCalls;
  }

  /**
   * Обработка события появления груза (load.created) из очереди
   */
  async handleLoadCreated(data: LoadCreatedJobData): Promise<void> {
    const { loadId, cargoCreatedAt } = data;
    const createdAtDate = new Date(cargoCreatedAt);

    // 1. Проверяем глобальный переключатель автозвонков
    const globallyEnabled = await this.isAutoCallGloballyEnabled();
    if (!globallyEnabled) {
      logger.info({ loadId }, '⏸️ Автозвонки глобально отключены диспетчером. Пропуск.');
      return;
    }

    // 2. Получаем груз из БД
    const cargo = await prisma.cargo.findUnique({
      where: { id: loadId },
      include: {
        assignedDriver: true,
      },
    });

    if (!cargo || cargo.status !== 'OPEN' || !cargo.autoCallEnabled) {
      logger.info({ loadId, status: cargo?.status }, 'Груз уже взят, закрыт или автозвонки по нему отключены.');
      return;
    }

    // 3. Запускаем таймер эскалации на 10 минут (если никто не возьмёт)
    this.scheduleEscalationTimer(cargo.id, cargo.cargoNumber);

    // 4. Ищем следующего кандидата-водителя и инициируем звонок
    await this.callNextEligibleDriver(cargo, createdAtDate);
  }

  /**
   * Поиск подходящего водителя и звонок
   */
  async callNextEligibleDriver(cargo: any, cargoCreatedAt: Date): Promise<boolean> {
    // Исключаем водителей, которым уже звонили по этому грузу (отказались или ответили)
    const pastCalls = await prisma.callAttempt.findMany({
      where: { loadId: cargo.id },
      select: { driverId: true, status: true, attemptNumber: true },
    });

    const excludedDriverIds = new Set(
      pastCalls
        .filter((c) => c.status === 'declined' || (c.status === 'no_answer' && c.attemptNumber >= 2) || c.status === 'accepted')
        .map((c) => c.driverId)
    );

    // Ищем подходящих водителей в БД
    const allDrivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        isBlocked: false,
        callConsent: true, // Только с согласием!
        workStatus: 'FREE',  // Только свободные!
        id: { notIn: Array.from(excludedDriverIds) },
      },
      include: {
        vehicle: true,
      },
    });

    // Фильтруем по городу, кузову и весу
    const eligibleDrivers = allDrivers.filter((driver) => {
      if (!driver.vehicle) return false;
      const cityMatch = driver.vehicle.currentCity.trim().toLowerCase() === cargo.originCity.trim().toLowerCase();
      const bodyMatch = driver.vehicle.bodyType.trim().toLowerCase() === cargo.bodyType.trim().toLowerCase();
      const capacityMatch = driver.vehicle.capacityTons >= cargo.weightTons;
      return cityMatch && bodyMatch && capacityMatch;
    });

    // Сортировка: сначала вес ближе всего к грузоподъёмности (минимальный недогруз)
    eligibleDrivers.sort((a, b) => {
      const diffA = (a.vehicle?.capacityTons || 0) - cargo.weightTons;
      const diffB = (b.vehicle?.capacityTons || 0) - cargo.weightTons;
      return diffA - diffB;
    });

    if (eligibleDrivers.length === 0) {
      logger.info({ loadId: cargo.id, cargoNumber: cargo.cargoNumber }, 'ℹ️ Нет доступных подходящих свободных водителей с согласием на автозвонки.');
      return false;
    }

    const targetDriver = eligibleDrivers[0];

    // Проверка спам-лимита
    const canCall = await this.canCallDriver(targetDriver.id);
    if (!canCall) {
      logger.warn({ driverId: targetDriver.id }, 'Водителю уже звонили максимальное количество раз за час. Пропуск звонка.');
      return false;
    }

    // Проверка ночного времени: ночью только SMS/Telegram!
    if (this.isNightTimeInKazakhstan()) {
      logger.info({ driver: targetDriver.fullName }, '🌙 Ночное время (23:00–06:00 Астана). Голосовой звонок отменён, отправляем тихий SMS/Telegram запасной канал.');
      await FallbackChannelService.sendDriverFallbackNotification({
        driverId: targetDriver.id,
        driverName: targetDriver.fullName,
        driverPhone: targetDriver.phone,
        cargo,
      });
      return false;
    }

    // 5. Резервируем груз за водителем на 2 минуты
    const reservedUntil = new Date(Date.now() + 2 * 60 * 1000);
    await prisma.cargo.update({
      where: { id: cargo.id },
      data: {
        reservedDriverId: targetDriver.id,
        reservedUntil,
      },
    });

    // 6. Замеряем задержку от момента создания груза до инициации звонка
    const now = Date.now();
    const latencyMs = Math.max(0, now - cargoCreatedAt.getTime());

    logger.info({
      event: 'AUTOCALL_INITIATION_START',
      cargoNumber: cargo.cargoNumber,
      driver: targetDriver.fullName,
      phone: targetDriver.phone,
      latencyMs,
      targetBelow3s: latencyMs <= 3000,
    }, `⏱️ Задержка от создания груза #${cargo.cargoNumber} до старта звонка: ${latencyMs} мс (Цель: < 3000 мс)`);

    // 7. Создаем запись попытки звонка
    const attempt = await prisma.callAttempt.create({
      data: {
        loadId: cargo.id,
        driverId: targetDriver.id,
        provider: 'mock',
        status: 'dialing',
        attemptNumber: 1,
        cargoCreatedAt,
        callInitiatedAt: new Date(now),
        latencyMs,
      },
    });

    // 8. Вызываем телефонию с защитой от сбоев (Failover)
    try {
      const callResponse = await telephonyService.initiateCallWithFailover({
        attemptId: attempt.id,
        loadId: cargo.id,
        driverId: targetDriver.id,
        toPhone: targetDriver.phone,
        cargo: {
          id: cargo.id,
          cargoNumber: cargo.cargoNumber,
          originCity: cargo.originCity,
          destinationCity: cargo.destinationCity,
          weightTons: cargo.weightTons,
          rateKzt: cargo.rateKzt,
          loadingDate: new Date(cargo.loadingDate).toLocaleDateString('ru-RU'),
        },
        driver: {
          id: targetDriver.id,
          fullName: targetDriver.fullName,
          phone: targetDriver.phone,
        },
        attemptNumber: 1,
      });

      // Обновляем попытку реальными данными провайдера
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: {
          provider: callResponse.provider,
          providerCallId: callResponse.result.providerCallId,
          status: callResponse.result.status,
          fallbackUsed: callResponse.usedFallback,
          startedAt: callResponse.result.initiatedAt,
        },
      });

      return true;
    } catch (err: any) {
      logger.error({ error: err.message, attemptId: attempt.id }, '❌ Сбой инициации звонка');
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'failed',
          error: err.message,
          endedAt: new Date(),
        },
      });

      // Снимаем резерв
      await this.releaseReservation(cargo.id);
      return false;
    }
  }

  /**
   * Снятие 2-минутного резерва
   */
  async releaseReservation(cargoId: string): Promise<void> {
    try {
      await prisma.cargo.update({
        where: { id: cargoId },
        data: {
          reservedDriverId: null,
          reservedUntil: null,
        },
      });
    } catch {
      // ignore
    }
  }

  /**
   * Обработка нажатия клавиши водителем (DTMF input из вебхука)
   */
  async handleDtmfInput(attemptId: string, dtmfDigit: string): Promise<{ action: string; message: string }> {
    logger.info({ attemptId, dtmfDigit }, `🎛️ [DTMF Webhook] Водитель нажал клавишу: ${dtmfDigit}`);

    const attempt = await prisma.callAttempt.findUnique({
      where: { id: attemptId },
      include: {
        cargo: true,
        driver: true,
      },
    });

    if (!attempt) {
      return { action: 'error', message: 'Попытка звонка не найдена' };
    }

    const { cargo, driver } = attempt;

    if (dtmfDigit === '1') {
      // ВОДИТЕЛЬ НАЖАЛ 1: ВЗЯТЬ ГРУЗ
      if (cargo.status !== 'OPEN') {
        return {
          action: 'taken',
          message: 'К сожалению, этот рейс уже был забронирован другим водителем.',
        };
      }

      // Закрепляем груз за водителем
      await prisma.$transaction([
        prisma.cargo.update({
          where: { id: cargo.id },
          data: {
            status: 'IN_PROGRESS',
            assignedDriverId: driver.id,
            reservedDriverId: null,
            reservedUntil: null,
          },
        }),
        prisma.callAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'accepted',
            dtmfKey: '1',
            endedAt: new Date(),
          },
        }),
        prisma.auditLog.create({
          data: {
            userId: driver.id,
            action: 'AUTOCALL_ACCEPTED',
            details: `Водитель ${driver.fullName} принял груз #${cargo.cargoNumber} (${cargo.originCity} → ${cargo.destinationCity}) через автозвонок (нажата клавиша 1)`,
          },
        }),
      ]);

      // Отменяем таймер эскалации диспетчеру
      this.clearEscalationTimer(cargo.id);

      logger.info({
        event: 'CARGO_ACCEPTED_VIA_AUTOCALL',
        cargoNumber: cargo.cargoNumber,
        driver: driver.fullName,
      }, `🎉 Водитель ${driver.fullName} принял рейс #${cargo.cargoNumber} по автозвонку!`);

      return {
        action: 'accepted',
        message: 'Спасибо, диспетчер скоро свяжется с вами.',
      };
    } else if (dtmfDigit === '2') {
      // ВОДИТЕЛЬ НАЖАЛ 2: ОТКАЗАТЬСЯ
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'declined',
          dtmfKey: '2',
          endedAt: new Date(),
        },
      });

      // Мгновенно снимаем резерв
      await this.releaseReservation(cargo.id);

      logger.info({
        cargoNumber: cargo.cargoNumber,
        driver: driver.fullName,
      }, `Водитель ${driver.fullName} отказался от груза #${cargo.cargoNumber}. Переход к следующему водителю.`);

      // Мгновенно звоним следующему водителю без задержек
      setTimeout(async () => {
        const freshCargo = await prisma.cargo.findUnique({ where: { id: cargo.id } });
        if (freshCargo && freshCargo.status === 'OPEN') {
          await this.callNextEligibleDriver(freshCargo, attempt.cargoCreatedAt);
        }
      }, 100);

      return {
        action: 'declined',
        message: 'Вы отказались от рейса. Хорошего дня!',
      };
    } else if (dtmfDigit === '9') {
      // ПОВТОРИТЬ СООБЩЕНИЕ
      return {
        action: 'repeat',
        message: 'Повторяем информацию о грузе.',
      };
    }

    return {
      action: 'unknown',
      message: 'Неизвестная команда. Нажмите 1 чтобы взять груз, или 2 чтобы отказаться.',
    };
  }

  /**
   * Обработка смены статуса вызова из вебхука провайдера
   */
  async handleCallStatusUpdate(attemptId: string, status: string, duration?: number): Promise<void> {
    logger.info({ attemptId, status, duration }, `📡 [Call Status Webhook] Обновление статуса: ${status}`);

    const attempt = await prisma.callAttempt.findUnique({
      where: { id: attemptId },
      include: {
        cargo: true,
        driver: true,
      },
    });

    if (!attempt || attempt.status === 'accepted') return;

    if (['no-answer', 'busy', 'failed', 'canceled'].includes(status.toLowerCase())) {
      const isFirstAttempt = attempt.attemptNumber === 1;

      if (isFirstAttempt) {
        // Повторный звонок через 60 секунд по ТЗ
        await prisma.callAttempt.update({
          where: { id: attempt.id },
          data: { status: 'no_answer', endedAt: new Date() },
        });

        logger.info({ attemptId }, '⏳ Водитель не ответил на 1-ю попытку. Планируем повторный звонок через 60 секунд...');

        setTimeout(async () => {
          const freshCargo = await prisma.cargo.findUnique({ where: { id: attempt.loadId } });
          if (freshCargo && freshCargo.status === 'OPEN') {
            await this.retryCallToDriver(attempt);
          }
        }, 60000);
      } else {
        // Повторный недозвон: отправляем SMS/Telegram и переходим к следующему водителю
        await prisma.callAttempt.update({
          where: { id: attempt.id },
          data: { status: 'no_answer', endedAt: new Date() },
        });

        await this.releaseReservation(attempt.loadId);

        // Отправка SMS / Telegram водителю
        await FallbackChannelService.sendDriverFallbackNotification({
          driverId: attempt.driverId,
          driverName: attempt.driver.fullName,
          driverPhone: attempt.driver.phone,
          cargo: attempt.cargo,
        });

        // Переходим к следующему водителю
        const freshCargo = await prisma.cargo.findUnique({ where: { id: attempt.loadId } });
        if (freshCargo && freshCargo.status === 'OPEN') {
          await this.callNextEligibleDriver(freshCargo, attempt.cargoCreatedAt);
        }
      }
    } else if (['in-progress', 'answered'].includes(status.toLowerCase())) {
      await prisma.callAttempt.update({
        where: { id: attempt.id },
        data: { status: 'answered', answeredAt: new Date() },
      });
    }
  }

  /**
   * Повторный звонок тому же водителю через 60 секунд (попытка №2)
   */
  async retryCallToDriver(prevAttempt: any): Promise<void> {
    const attempt2 = await prisma.callAttempt.create({
      data: {
        loadId: prevAttempt.loadId,
        driverId: prevAttempt.driverId,
        provider: 'mock',
        status: 'dialing',
        attemptNumber: 2,
        cargoCreatedAt: prevAttempt.cargoCreatedAt,
        callInitiatedAt: new Date(),
      },
    });

    try {
      const callResponse = await telephonyService.initiateCallWithFailover({
        attemptId: attempt2.id,
        loadId: prevAttempt.loadId,
        driverId: prevAttempt.driverId,
        toPhone: prevAttempt.driver.phone,
        cargo: {
          id: prevAttempt.cargo.id,
          cargoNumber: prevAttempt.cargo.cargoNumber,
          originCity: prevAttempt.cargo.originCity,
          destinationCity: prevAttempt.cargo.destinationCity,
          weightTons: prevAttempt.cargo.weightTons,
          rateKzt: prevAttempt.cargo.rateKzt,
          loadingDate: new Date(prevAttempt.cargo.loadingDate).toLocaleDateString('ru-RU'),
        },
        driver: {
          id: prevAttempt.driver.id,
          fullName: prevAttempt.driver.fullName,
          phone: prevAttempt.driver.phone,
        },
        attemptNumber: 2,
      });

      await prisma.callAttempt.update({
        where: { id: attempt2.id },
        data: {
          provider: callResponse.provider,
          providerCallId: callResponse.result.providerCallId,
          status: callResponse.result.status,
          fallbackUsed: callResponse.usedFallback,
          startedAt: callResponse.result.initiatedAt,
        },
      });
    } catch {
      await this.releaseReservation(prevAttempt.loadId);
    }
  }

  /**
   * Тестовый звонок на телефон диспетчера
   */
  async performTestCall(toPhone: string): Promise<{ success: boolean; callId: string; provider: string }> {
    const testCargo = {
      id: 'test-cargo',
      cargoNumber: 999,
      originCity: 'Астана',
      destinationCity: 'Алматы',
      weightTons: 15,
      rateKzt: 750000,
      loadingDate: 'завтра',
    };

    const testDriver = {
      id: 'test-user',
      fullName: 'Тестовый звонок DELLA',
      phone: toPhone,
    };

    const callResult = await telephonyService.initiateCallWithFailover({
      attemptId: `test-${Date.now()}`,
      loadId: testCargo.id,
      driverId: testDriver.id,
      toPhone,
      cargo: testCargo,
      driver: testDriver,
      attemptNumber: 1,
    });

    return {
      success: true,
      callId: callResult.result.providerCallId,
      provider: callResult.provider,
    };
  }

  private scheduleEscalationTimer(cargoId: string, cargoNumber: number) {
    const timeoutMinutes = parseInt(process.env.ESCALATION_TIMEOUT_MINUTES || '10', 10);
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const timer = setTimeout(async () => {
      const cargo = await prisma.cargo.findUnique({ where: { id: cargoId } });
      if (cargo && cargo.status === 'OPEN') {
        await FallbackChannelService.sendDispatcherEscalation(cargoNumber, cargoId);
      }
    }, timeoutMs);

    this.escalationTimers.set(cargoId, timer);
  }

  private clearEscalationTimer(cargoId: string) {
    const timer = this.escalationTimers.get(cargoId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(cargoId);
    }
  }
}

export const autoCallManager = AutoCallManager.getInstance();

