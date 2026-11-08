import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/index.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  createDriverSchema,
  resetPasswordSchema,
  updateCallConsentSchema,
} from '../validators/driver.validator.js';
import {
  createCargoSchema,
  updateCargoSchema,
  changeRateSchema,
  updateCargoStatusSchema,
} from '../validators/cargo.validator.js';
import {
  callLogSchema,
  updateComplaintStatusSchema,
} from '../validators/complaint.validator.js';
import { MatchingService } from '../services/matching.service.js';
import { logAudit } from '../services/audit.service.js';
import { autoCallQueue } from '../services/queue/AutoCallQueue.js';
import { autoCallManager } from '../services/autocall/AutoCallManager.js';
import { normalizePhone, isValidE164Phone } from '../utils/phone.js';

export const dispatcherRouter = Router();

// Все эндпоинты требуют роли DISPATCHER
dispatcherRouter.use(authenticateToken, requireRole('DISPATCHER'));

/* ==========================================================================
   1. ВОДИТЕЛИ (DRIVERS)
   ========================================================================== */

// GET /api/dispatcher/drivers — список всех водителей
dispatcherRouter.get('/drivers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, city, bodyType, isBlocked } = req.query;

    const where: any = { role: 'DRIVER' };

    if (isBlocked !== undefined) {
      where.isBlocked = isBlocked === 'true';
    }

    if (search) {
      where.OR = [
        { fullName: { contains: String(search) } },
        { phone: { contains: String(search) } },
        { login: { contains: String(search) } },
      ];
    }

    if (city || bodyType) {
      where.vehicle = {
        ...(city ? { currentCity: String(city) } : {}),
        ...(bodyType ? { bodyType: String(bodyType) } : {}),
      };
    }

    const drivers = await prisma.user.findMany({
      where,
      include: {
        vehicle: true,
        reviewsReceived: {
          select: { rating: true },
        },
        complaintsAgainstDriver: {
          select: { id: true, status: true },
        },
        callLogsAsDriver: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        callAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedDrivers = drivers.map((driver) => {
      const ratings = driver.reviewsReceived.map((r) => r.rating);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 5.0;

      const activeComplaints = driver.complaintsAgainstDriver.filter(
        (c) => c.status !== 'RESOLVED'
      ).length;

      return {
        id: driver.id,
        login: driver.login,
        fullName: driver.fullName,
        phone: driver.phone,
        issuedPassword: driver.issuedPassword || null,
        isBlocked: driver.isBlocked,
        callConsent: driver.callConsent,
        callConsentAt: driver.callConsentAt,
        workStatus: driver.workStatus,
        createdAt: driver.createdAt,
        vehicle: driver.vehicle,
        avgRating,
        reviewsCount: ratings.length,
        activeComplaintsCount: activeComplaints,
        latestCall: driver.callLogsAsDriver[0] || null,
        latestAutoCall: driver.callAttempts[0] || null,
      };
    });

    res.json({
      success: true,
      drivers: formattedDrivers,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/dispatcher/drivers — создать нового водителя с валидацией E.164
dispatcherRouter.post('/drivers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createDriverSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { login: validated.login },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: `Водитель с логином «${validated.login}» уже зарегистрирован в системе. Выберите другой логин.`,
      });
      return;
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone: validated.phone },
    });

    if (existingPhone) {
      res.status(409).json({
        success: false,
        error: `Водитель с номером телефона «${validated.phone}» уже зарегистрирован в системе. Номер должен быть уникальным.`,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const newDriver = await prisma.user.create({
      data: {
        login: validated.login,
        password: hashedPassword,
        issuedPassword: validated.password,
        fullName: validated.fullName,
        phone: validated.phone,
        role: 'DRIVER',
        callConsent: validated.callConsent !== undefined ? validated.callConsent : true,
        callConsentAt: validated.callConsent ? new Date() : null,
        workStatus: validated.workStatus || 'FREE',
        vehicle: {
          create: {
            capacityTons: validated.vehicle.capacityTons,
            bodyType: validated.vehicle.bodyType,
            currentCity: validated.vehicle.currentCity,
            plateNumber: validated.vehicle.plateNumber || null,
            model: validated.vehicle.model || null,
          },
        },
      },
      include: {
        vehicle: true,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'CREATE_DRIVER',
      details: `Диспетчер ${req.user!.fullName} создал водителя: ${newDriver.fullName} (${newDriver.phone}, авто: ${newDriver.vehicle?.bodyType}, ${newDriver.vehicle?.capacityTons} т, согласие на звонки: ${newDriver.callConsent ? 'ДА' : 'НЕТ'})`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Водитель успешно создан. Передайте логин и пароль водителю.',
      driver: {
        id: newDriver.id,
        login: newDriver.login,
        fullName: newDriver.fullName,
        phone: newDriver.phone,
        callConsent: newDriver.callConsent,
        workStatus: newDriver.workStatus,
        vehicle: newDriver.vehicle,
      },
      initialPassword: validated.password,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dispatcher/drivers/:id/call-consent — управление согласием водителя на автозвонки
dispatcherRouter.patch('/drivers/:id/call-consent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = updateCallConsentSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        callConsent: validated.callConsent,
        callConsentAt: validated.callConsent ? new Date() : null,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: validated.callConsent ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
      details: `Диспетчер ${req.user!.fullName} ${validated.callConsent ? 'установил' : 'отозвал'} согласие на автозвонки для водителя ${updated.fullName}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Согласие на автоматические звонки ${validated.callConsent ? 'активировано' : 'отключено'}.`,
      driver: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dispatcher/drivers/:id/block — заблокировать / разблокировать
dispatcherRouter.patch('/drivers/:id/block', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isBlocked } = req.body;

    const driver = await prisma.user.findUnique({ where: { id } });

    if (!driver || driver.role !== 'DRIVER') {
      res.status(404).json({ success: false, error: 'Водитель не найден.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBlocked: Boolean(isBlocked) },
    });

    await logAudit({
      userId: req.user!.id,
      action: isBlocked ? 'BLOCK_DRIVER' : 'UNBLOCK_DRIVER',
      details: `Диспетчер ${req.user!.fullName} ${isBlocked ? 'заблокировал' : 'разблокировал'} водителя ${driver.fullName}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Водитель ${driver.fullName} ${isBlocked ? 'заблокирован' : 'разблокирован'}.`,
      driver: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/dispatcher/drivers/:id/reset-password — сбросить пароль
dispatcherRouter.post('/drivers/:id/reset-password', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = resetPasswordSchema.parse(req.body);

    const driver = await prisma.user.findUnique({ where: { id } });

    if (!driver || driver.role !== 'DRIVER') {
      res.status(404).json({ success: false, error: 'Водитель не найден.' });
      return;
    }

    const newPassword = validated.password || Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        issuedPassword: newPassword,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'RESET_PASSWORD',
      details: `Диспетчер ${req.user!.fullName} сбросил пароль водителю ${driver.fullName}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Пароль успешно обновлён. Передайте новый пароль водителю.',
      newPassword,
    });
  } catch (error) {
    next(error);
  }
});

/* ==========================================================================
   2. ГРУЗЫ (CARGOS)
   ========================================================================== */

// GET /api/dispatcher/cargos — список всех грузов с фильтрами и историей автозвонков
dispatcherRouter.get('/cargos', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, originCity, destinationCity, bodyType } = req.query;

    const where: any = {};
    if (status) where.status = String(status);
    if (originCity) where.originCity = String(originCity);
    if (destinationCity) where.destinationCity = String(destinationCity);
    if (bodyType) where.bodyType = String(bodyType);

    const cargos = await prisma.cargo.findMany({
      where,
      include: {
        assignedDriver: {
          select: { id: true, fullName: true, phone: true },
        },
        rateChanges: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { fullName: true } },
          },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            driver: { select: { fullName: true, phone: true } },
            dispatcher: { select: { fullName: true } },
          },
        },
        callAttempts: {
          orderBy: { createdAt: 'desc' },
          include: {
            driver: { select: { id: true, fullName: true, phone: true } },
          },
        },
        driverRequests: {
          include: {
            driver: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      cargos,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/dispatcher/cargos — добавить груз и СРАЗУ поставить в очередь автозвонков!
dispatcherRouter.post('/cargos', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createCargoSchema.parse(req.body);

    const lastCargo = await prisma.cargo.findFirst({
      orderBy: { cargoNumber: 'desc' },
      select: { cargoNumber: true },
    });
    const nextNumber = (lastCargo?.cargoNumber || 100) + 1;

    // Сохраняем груз в БД
    const cargo = await prisma.cargo.create({
      data: {
        cargoNumber: nextNumber,
        originCity: validated.originCity,
        destinationCity: validated.destinationCity,
        weightTons: validated.weightTons,
        bodyType: validated.bodyType,
        loadingDate: new Date(validated.loadingDate),
        rateKzt: validated.rateKzt,
        rateStatus: validated.rateStatus || 'CONFIRMED',
        status: 'OPEN',
        autoCallEnabled: true,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        customerCompany: validated.customerCompany || null,
        description: validated.description || null,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'CREATE_CARGO',
      details: `Диспетчер ${req.user!.fullName} создал груз #${cargo.cargoNumber}: ${cargo.originCity} → ${cargo.destinationCity}, ${cargo.weightTons} т, ставка: ${cargo.rateKzt.toLocaleString('ru-RU')} ₸`,
      ip: req.ip || req.socket.remoteAddress,
    });

    // ⚡ ТРЕБОВАНИЕ ТЗ: Звонок должен быть инициирован не позже 3 секунд после появления груза.
    // Ставим событие load.created в очередь сразу же!
    await autoCallQueue.enqueueLoadCreated({
      loadId: cargo.id,
      cargoCreatedAt: cargo.createdAt.toISOString(),
    });

    res.status(201).json({
      success: true,
      message: `Груз #${cargo.cargoNumber} успешно добавлен и отправлен в очередь автозвонков роботом.`,
      cargo,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dispatcher/cargos/:id/toggle-autocall — остановить/возобновить автозвонки по грузу
dispatcherRouter.patch('/cargos/:id/toggle-autocall', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { enabled } = req.body;

    const updated = await prisma.cargo.update({
      where: { id },
      data: { autoCallEnabled: Boolean(enabled) },
    });

    await logAudit({
      userId: req.user!.id,
      action: enabled ? 'RESUME_AUTOCALL' : 'STOP_AUTOCALL',
      details: `Диспетчер ${req.user!.fullName} ${enabled ? 'возобновил' : 'остановил'} автозвонки по грузу #${updated.cargoNumber}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Автозвонки по грузу #${updated.cargoNumber} ${enabled ? 'включены' : 'остановлены'}.`,
      cargo: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/dispatcher/cargos/:id — редактировать параметры груза
dispatcherRouter.put('/cargos/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = updateCargoSchema.parse(req.body);

    const updated = await prisma.cargo.update({
      where: { id },
      data: {
        ...(validated.originCity ? { originCity: validated.originCity } : {}),
        ...(validated.destinationCity ? { destinationCity: validated.destinationCity } : {}),
        ...(validated.weightTons ? { weightTons: validated.weightTons } : {}),
        ...(validated.bodyType ? { bodyType: validated.bodyType } : {}),
        ...(validated.loadingDate ? { loadingDate: new Date(validated.loadingDate) } : {}),
        ...(validated.customerName ? { customerName: validated.customerName } : {}),
        ...(validated.customerPhone ? { customerPhone: validated.customerPhone } : {}),
        ...(validated.customerCompany !== undefined ? { customerCompany: validated.customerCompany } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE_CARGO',
      details: `Диспетчер ${req.user!.fullName} обновил параметры груза #${updated.cargoNumber}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Параметры груза успешно обновлены.',
      cargo: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dispatcher/cargos/:id/rate — ЧЕСТНАЯ СТАВКА
dispatcherRouter.patch('/cargos/:id/rate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = changeRateSchema.parse(req.body);

    const cargo = await prisma.cargo.findUnique({ where: { id } });

    if (!cargo) {
      res.status(404).json({ success: false, error: 'Груз не найден.' });
      return;
    }

    const oldRate = cargo.rateKzt;
    const newRate = validated.newRate;

    const [updatedCargo, rateHistory] = await prisma.$transaction([
      prisma.cargo.update({
        where: { id },
        data: {
          rateKzt: newRate,
          rateStatus: 'CONFIRMED',
        },
      }),
      prisma.rateChangeHistory.create({
        data: {
          cargoId: id,
          oldRate,
          newRate,
          reason: validated.reason,
          changedById: req.user!.id,
        },
        include: {
          changedBy: { select: { fullName: true } },
        },
      }),
    ]);

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE_RATE',
      details: `Диспетчер ${req.user!.fullName} изменил ставку по грузу #${cargo.cargoNumber}: было ${oldRate.toLocaleString('ru-RU')} ₸ → стало ${newRate.toLocaleString('ru-RU')} ₸. Причина: ${validated.reason}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Ставка по рейсу #${cargo.cargoNumber} успешно изменена на ${newRate.toLocaleString('ru-RU')} ₸.`,
      cargo: updatedCargo,
      rateChange: rateHistory,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dispatcher/cargos/:id/status — сменить статус груза
dispatcherRouter.patch('/cargos/:id/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = updateCargoStatusSchema.parse(req.body);

    const updated = await prisma.cargo.update({
      where: { id },
      data: {
        status: validated.status,
        ...(validated.driverId !== undefined ? { assignedDriverId: validated.driverId } : {}),
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'UPDATE_CARGO_STATUS',
      details: `Диспетчер ${req.user!.fullName} изменил статус груза #${updated.cargoNumber} на ${validated.status}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Статус груза #${updated.cargoNumber} изменён.`,
      cargo: updated,
    });
  } catch (error) {
    next(error);
  }
});

/* ==========================================================================
   3. МОНИТОРИНГ АВТОЗВОНКОВ И ТЕСТОВЫЙ ЗВОНОК (CALL MONITORING & TESTING)
   ========================================================================== */

// GET /api/dispatcher/calls/monitoring — живой мониторинг звонков со счётчиком задержки (< 3с)
dispatcherRouter.get('/calls/monitoring', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attempts = await prisma.callAttempt.findMany({
      include: {
        cargo: {
          select: {
            id: true,
            cargoNumber: true,
            originCity: true,
            destinationCity: true,
            weightTons: true,
            rateKzt: true,
            status: true,
          },
        },
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            callConsent: true,
            workStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const isGloballyEnabled = await autoCallManager.isAutoCallGloballyEnabled();

    // Расчёт аналитических показателей по звонкам
    const totalCalls = attempts.length;
    const latencies = attempts.filter((a) => a.latencyMs !== null).map((a) => a.latencyMs as number);
    const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const fastCallsCount = latencies.filter((l) => l <= 3000).length;
    const fastCallsPercentage = latencies.length > 0 ? Math.round((fastCallsCount / latencies.length) * 100) : 100;
    const acceptedCount = attempts.filter((a) => a.status === 'accepted').length;

    res.json({
      success: true,
      isGloballyEnabled,
      metrics: {
        totalCalls,
        avgLatencyMs,
        targetMetPercentage: fastCallsPercentage,
        callsBelow3s: fastCallsCount,
        acceptedCalls: acceptedCount,
        escalationTimeoutMinutes: parseInt(process.env.ESCALATION_TIMEOUT_MINUTES || '10', 10),
      },
      queueStatus: autoCallQueue.getHealthStatus(),
      calls: attempts,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/dispatcher/calls/test-call — тестовый звонок на телефон диспетчера
dispatcherRouter.post('/calls/test-call', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.body;
    const normalized = normalizePhone(phone);

    if (!isValidE164Phone(normalized)) {
      res.status(400).json({
        success: false,
        error: 'Укажите корректный номер телефона в формате +7 (например, +77011234567)',
      });
      return;
    }

    const testResult = await autoCallManager.performTestCall(normalized);

    await logAudit({
      userId: req.user!.id,
      action: 'TEST_AUTOCALL',
      details: `Диспетчер ${req.user!.fullName} запустил тестовый звонок на номер ${normalized} через провайдера [${testResult.provider}]`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Тестовый звонок успешно отправлен на номер ${normalized} через провайдера [${testResult.provider}]. Робот проговорит тестовое сообщение груза.`,
      callId: testResult.callId,
      provider: testResult.provider,
    });
  } catch (error: any) {
    next(error);
  }
});

// PATCH /api/dispatcher/calls/global-toggle — глобальный тумблер автозвонков (ВКЛ / ВЫКЛ)
dispatcherRouter.patch('/calls/global-toggle', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { enabled } = req.body;
    const val = enabled ? 'true' : 'false';

    await prisma.systemSetting.upsert({
      where: { key: 'AUTO_CALL_ENABLED' },
      create: { key: 'AUTO_CALL_ENABLED', value: val },
      update: { value: val },
    });

    await logAudit({
      userId: req.user!.id,
      action: enabled ? 'ENABLE_AUTOCALLS_GLOBAL' : 'DISABLE_AUTOCALLS_GLOBAL',
      details: `Диспетчер ${req.user!.fullName} ${enabled ? 'ВКЛЮЧИЛ' : 'ВЫКЛЮЧИЛ'} автоматические звонки роботом в системе`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Автоматические звонки ${enabled ? 'включены' : 'приостановлены'} по всей системе.`,
      enabled: Boolean(enabled),
    });
  } catch (error) {
    next(error);
  }
});

/* ==========================================================================
   4. ПОДБОР И ЗВОНКИ (MATCHING & CALLS)
   ========================================================================== */

// GET /api/dispatcher/matching/:cargoId — список подходящих водителей
dispatcherRouter.get('/matching/:cargoId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cargoId = req.params.cargoId as string;

    const cargo = await prisma.cargo.findUnique({
      where: { id: cargoId },
    });

    if (!cargo) {
      res.status(404).json({ success: false, error: 'Груз не найден.' });
      return;
    }

    const matches = await MatchingService.findDriversForCargo(cargoId);

    res.json({
      success: true,
      cargo,
      matches,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/dispatcher/calls — зафиксировать ручной звонок водителю
dispatcherRouter.post('/calls', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = callLogSchema.parse(req.body);

    const cargo = await prisma.cargo.findUnique({ where: { id: validated.cargoId } });
    const driver = await prisma.user.findUnique({ where: { id: validated.driverId } });

    if (!cargo || !driver) {
      res.status(404).json({ success: false, error: 'Груз или водитель не найдены.' });
      return;
    }

    const callLog = await prisma.callLog.create({
      data: {
        cargoId: validated.cargoId,
        driverId: validated.driverId,
        dispatcherId: req.user!.id,
        outcome: validated.outcome,
        comment: validated.comment || null,
      },
      include: {
        driver: { select: { fullName: true, phone: true } },
        dispatcher: { select: { fullName: true } },
      },
    });

    if (validated.outcome === 'AGREED') {
      await prisma.cargo.update({
        where: { id: validated.cargoId },
        data: {
          status: 'IN_PROGRESS',
          assignedDriverId: validated.driverId,
          reservedDriverId: null,
          reservedUntil: null,
        },
      });
    }

    const outcomeLabels: Record<string, string> = {
      AGREED: 'Согласен взять груз',
      DECLINED: 'Отказался',
      NO_ANSWER: 'Не ответил',
    };

    await logAudit({
      userId: req.user!.id,
      action: 'CALL_DRIVER',
      details: `Диспетчер ${req.user!.fullName} позвонил водителю ${driver.fullName} по рейсу #${cargo.cargoNumber}. Результат: ${outcomeLabels[validated.outcome]}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(201).json({
      success: true,
      message: `Результат звонка зафиксирован: «${outcomeLabels[validated.outcome]}».`,
      callLog,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dispatcher/notifications — системные уведомления для диспетчера
dispatcherRouter.get('/notifications', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await MatchingService.getDispatcherNotifications();

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
});

/* ==========================================================================
   5. ЖАЛОБЫ (COMPLAINTS) & АУДИТ
   ========================================================================== */

// GET /api/dispatcher/complaints — список всех жалоб
dispatcherRouter.get('/complaints', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = String(status);

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        author: { select: { id: true, fullName: true, phone: true, role: true } },
        targetDriver: { select: { id: true, fullName: true, phone: true } },
        targetCargo: { select: { id: true, cargoNumber: true, originCity: true, destinationCity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, complaints });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dispatcher/complaints/:id — обновить статус и решение по жалобе
dispatcherRouter.patch('/complaints/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = updateComplaintStatusSchema.parse(req.body);

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: validated.status,
        resolution: validated.resolution !== undefined ? validated.resolution : undefined,
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'RESOLVE_COMPLAINT',
      details: `Диспетчер ${req.user!.fullName} обновил статус жалобы #${id.slice(0, 8)} на ${validated.status}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Статус жалобы успешно обновлён.',
      complaint: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dispatcher/audit-logs — журнал действий
dispatcherRouter.get('/audit-logs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, fullName: true, role: true, login: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
});
