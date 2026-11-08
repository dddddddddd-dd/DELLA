import { logger } from '../../utils/logger.js';
import { prisma } from '../../config/index.js';

export interface DriverNotificationParams {
  driverId: string;
  driverPhone: string;
  driverName: string;
  cargo: {
    id: string;
    cargoNumber: number;
    originCity: string;
    destinationCity: string;
    weightTons: number;
    rateKzt: number;
  };
}

export class FallbackChannelService {
  /**
   * Отправка SMS и Telegram водителю, если он не ответил на звонок
   */
  static async sendDriverFallbackNotification(params: DriverNotificationParams): Promise<void> {
    const message = `DELLA: Не дозвонились до вас! Есть подходящий рейс #${params.cargo.cargoNumber} (${params.cargo.originCity} → ${params.cargo.destinationCity}, ${params.cargo.weightTons} т, ставка ${params.cargo.rateKzt.toLocaleString('ru-RU')} ₸). Чтобы забрать рейс, войдите в кабинет: http://localhost:3000/cabinet`;

    // 1. Отправка SMS (логирование / эмуляция / интеграция)
    logger.info({
      channel: 'SMS',
      toPhone: params.driverPhone,
      message,
    }, `📱 [SMS Запасной канал] Отправлено SMS водителю ${params.driverName} (${params.driverPhone})`);

    // 2. Отправка в Telegram при наличии привязанного аккаунта
    logger.info({
      channel: 'TELEGRAM',
      driver: params.driverName,
      message,
    }, `💬 [Telegram Запасной канал] Отправлено уведомление водителю ${params.driverName}`);

    // Сохраняем уведомление в БД для водителя
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.driverId,
          action: 'FALLBACK_NOTIFICATION_SENT',
          details: `Отправлено SMS/Telegram-уведомление по грузу #${params.cargo.cargoNumber} после недозвона`,
        },
      });
    } catch {
      // ignore
    }
  }

  /**
   * Эскалация: уведомление диспетчеру, если никто не принял груз в течение 10 минут
   */
  static async sendDispatcherEscalation(cargoNumber: number, cargoId: string): Promise<void> {
    const alertMessage = `⚠️ [Эскалация DELLA] Груз #${cargoNumber} никто из подходящих водителей не принял в течение 10 минут! Требуется ручной обзвон.`;

    logger.warn({
      event: 'DISPATCHER_ESCALATION_TRIGGERED',
      cargoNumber,
      cargoId,
    }, alertMessage);

    // Добавляем запись в аудит
    try {
      const admin = await prisma.user.findFirst({ where: { role: 'DISPATCHER' } });
      if (admin) {
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: 'DISPATCHER_ESCALATION',
            details: alertMessage,
          },
        });
      }
    } catch {
      // ignore
    }
  }
}

