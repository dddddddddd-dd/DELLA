import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/index.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { updateVehicleSchema, updateWorkStatusSchema } from '../validators/driver.validator.js';
import { createReviewSchema, createComplaintSchema } from '../validators/complaint.validator.js';
import { MatchingService } from '../services/matching.service.js';
import { logAudit } from '../services/audit.service.js';

export const driverRouter = Router();

// Все эндпоинты требуют авторизации водителя
driverRouter.use(authenticateToken, requireRole('DRIVER'));

// GET /api/driver/vehicle — получить параметры своего автомобиля
driverRouter.get('/vehicle', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: req.user!.id },
    });

    res.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/driver/vehicle — обновить параметры автомобиля ("Моя машина", сохраняется в профиле)
driverRouter.put('/vehicle', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = updateVehicleSchema.parse(req.body);

    const vehicle = await prisma.vehicle.upsert({
      where: { driverId: req.user!.id },
      create: {
        driverId: req.user!.id,
        capacityTons: validated.capacityTons,
        bodyType: validated.bodyType,
        currentCity: validated.currentCity,
        plateNumber: validated.plateNumber || null,
        model: validated.model || null,
      },
      update: {
        capacityTons: validated.capacityTons,
        bodyType: validated.bodyType,
        currentCity: validated.currentCity,
        plateNumber: validated.plateNumber !== undefined ? validated.plateNumber : undefined,
        model: validated.model !== undefined ? validated.model : undefined,
      },
    });

    res.json({
      success: true,
      message: 'Параметры машины успешно сохранены в профиле',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/driver/work-status — смена статуса доступности водителя ("свободен" / "в рейсе" / "отдыхает")
driverRouter.patch('/work-status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = updateWorkStatusSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { workStatus: validated.workStatus },
    });

    const statusLabels: Record<string, string> = {
      FREE: 'Свободен (готов принимать звонки)',
      IN_TRIP: 'В рейсе (звонки приостановлены)',
      RESTING: 'Отдыхает (звонки приостановлены)',
    };

    await logAudit({
      userId: req.user!.id,
      action: 'DRIVER_STATUS_CHANGE',
      details: `Водитель ${req.user!.fullName} сменил свой рабочий статус на «${statusLabels[validated.workStatus]}»`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: `Статус обновлён: ${statusLabels[validated.workStatus]}`,
      workStatus: updatedUser.workStatus,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/driver/matching-cargos — подходящие грузы с умной сортировкой
driverRouter.get('/matching-cargos', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: req.user!.id },
    });

    if (!vehicle) {
      res.json({
        success: true,
        vehicle: null,
        cargos: [],
        message: 'Для поиска подходящих грузов заполните карточку «Моя машина».',
      });
      return;
    }

    const matches = await MatchingService.findCargosForDriver(req.user!.id);

    res.json({
      success: true,
      vehicle,
      cargos: matches,
      count: matches.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/driver/take-cargo/:id — кнопка «Беру груз»
driverRouter.post('/take-cargo/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cargoId = req.params.id as string;

    const cargo = await prisma.cargo.findUnique({
      where: { id: cargoId },
    });

    if (!cargo) {
      res.status(404).json({
        success: false,
        error: 'Груз не найден.',
      });
      return;
    }

    if (cargo.status !== 'OPEN') {
      res.status(400).json({
        success: false,
        error: 'Этот груз уже взят в работу или закрыт.',
      });
      return;
    }

    const requestId = `${cargoId}-${req.user!.id}`;

    await prisma.driverCargoRequest.upsert({
      where: {
        id: requestId,
      },
      create: {
        id: requestId,
        cargoId,
        driverId: req.user!.id,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'DRIVER_TAKE_CARGO',
      details: `Водитель ${req.user!.fullName} нажал «Беру груз» на рейс #${cargo.cargoNumber} (${cargo.originCity} → ${cargo.destinationCity})`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Заявка принята! Диспетчер DELLA получил уведомление и свяжется с вами по телефону для подтверждения погрузки.',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/driver/history — история рейсов водителя
driverRouter.get('/history', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cargos = await prisma.cargo.findMany({
      where: {
        OR: [
          { assignedDriverId: req.user!.id },
          {
            driverRequests: {
              some: {
                driverId: req.user!.id,
                status: 'ACCEPTED',
              },
            },
          },
        ],
      },
      include: {
        rateChanges: {
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          where: { authorId: req.user!.id },
        },
        complaints: {
          where: { authorId: req.user!.id },
        },
      },
      orderBy: { loadingDate: 'desc' },
    });

    res.json({
      success: true,
      cargos,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/driver/review — оставить отзыв и оценку (1-5) по рейсу
driverRouter.post('/review', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createReviewSchema.parse(req.body);

    const cargo = await prisma.cargo.findUnique({
      where: { id: validated.cargoId },
    });

    if (!cargo) {
      res.status(404).json({
        success: false,
        error: 'Груз не найден.',
      });
      return;
    }

    const existing = await prisma.review.findFirst({
      where: {
        cargoId: validated.cargoId,
        authorId: req.user!.id,
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: 'Вы уже оставили отзыв по этому рейсу.',
      });
      return;
    }

    const review = await prisma.review.create({
      data: {
        cargoId: validated.cargoId,
        authorId: req.user!.id,
        targetUserId: validated.targetUserId || null,
        rating: validated.rating,
        comment: validated.comment || null,
      },
    });

    res.json({
      success: true,
      message: 'Спасибо! Ваш отзыв и оценка успешно сохранены.',
      review,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/driver/complaint — пожаловаться на груз или заказчика
driverRouter.post('/complaint', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = createComplaintSchema.parse(req.body);

    const complaint = await prisma.complaint.create({
      data: {
        authorId: req.user!.id,
        targetCargoId: validated.targetCargoId || null,
        targetDriverId: validated.targetDriverId || null,
        reason: validated.reason,
        comment: validated.comment,
        status: 'NEW',
      },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'DRIVER_SUBMIT_COMPLAINT',
      details: `Водитель ${req.user!.fullName} подал жалобу: ${validated.reason}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Жалоба зарегистрирована и направлена старшему диспетчеру на рассмотрение.',
      complaint,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/driver/notifications — уведомления для водителя
driverRouter.get('/notifications', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: req.user!.id },
    });

    if (!vehicle) {
      res.json({ success: true, notifications: [] });
      return;
    }

    const rateChanges = await prisma.rateChangeHistory.findMany({
      where: {
        cargo: {
          originCity: vehicle.currentCity,
          bodyType: vehicle.bodyType,
        },
      },
      include: {
        cargo: true,
        changedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const notifications = rateChanges.map((change) => ({
      id: change.id,
      type: 'RATE_CHANGED',
      title: `Изменение ставки по рейсу #${change.cargo.cargoNumber}`,
      message: `Диспетчер ${change.changedBy.fullName} изменил ставку с ${change.oldRate.toLocaleString('ru-RU')} ₸ на ${change.newRate.toLocaleString('ru-RU')} ₸ (Причина: ${change.reason})`,
      createdAt: change.createdAt,
    }));

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
});
