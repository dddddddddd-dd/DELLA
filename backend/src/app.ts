import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes.js';
import { driverRouter } from './routes/driver.routes.js';
import { dispatcherRouter } from './routes/dispatcher.routes.js';
import { webhookRouter } from './routes/webhook.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { prisma } from './config/index.js';
import { autoCallQueue } from './services/queue/AutoCallQueue.js';
import { telephonyService } from './services/telephony/TelephonyService.js';

export const createApp = () => {
  const app = express();

  // Безопасность и заголовки
  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Расширенный Health-check (БД, Очередь / Redis, Провайдеры телефонии)
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'ok';
    try {
      await prisma.user.findFirst({ select: { id: true } });
    } catch {
      dbStatus = 'error';
    }

    const queueHealth = autoCallQueue.getHealthStatus();
    const primary = telephonyService.getPrimaryProvider();
    const fallback = telephonyService.getFallbackProvider();

    const isHealthy = dbStatus === 'ok';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'DELLA Logistics & AutoCall Engine',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: {
        status: dbStatus,
        provider: 'Prisma (SQLite/PostgreSQL)',
      },
      queue: queueHealth,
      telephony: {
        primary: {
          name: primary.name,
          configured: primary.isConfigured(),
        },
        fallback: {
          name: fallback.name,
          configured: fallback.isConfigured(),
        },
      },
    });
  });

  // Маршруты
  app.use('/api/auth', authRouter);
  app.use('/api/driver', driverRouter);
  app.use('/api/dispatcher', dispatcherRouter);
  app.use('/api/webhooks', webhookRouter);

  // Обработчик ошибок
  app.use(errorHandler);

  return app;
};
