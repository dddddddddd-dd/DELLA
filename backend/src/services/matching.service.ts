import { prisma } from '../config/index.js';

export interface MatchingCargoResult {
  cargo: any;
  weightDifferenceTons: number;
  isBestMatch: boolean;
}

export interface MatchingDriverResult {
  driver: any;
  capacityDifferenceTons: number;
  callLog?: any;
}

export class MatchingService {
  /**
   * Подбор подходящих грузов для водителя на основе его автомобиля:
   * 1. Вес груза <= грузоподъёмность машины
   * 2. Тип кузова совпадает
   * 3. Город погрузки совпадает с текущим городом машины водителя
   * 4. Статус груза = 'OPEN'
   */
  static async findCargosForDriver(driverId: string): Promise<MatchingCargoResult[]> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId },
    });

    if (!vehicle) {
      return [];
    }

    const { capacityTons, bodyType, currentCity } = vehicle;

    // Ищем все открытые грузы в городе водителя с подходящим кузовом
    const openCargos = await prisma.cargo.findMany({
      where: {
        status: 'OPEN',
        weightTons: {
          lte: capacityTons,
        },
      },
      include: {
        rateChanges: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: {
              select: { fullName: true, role: true },
            },
          },
        },
        driverRequests: {
          where: { driverId },
        },
      },
    });

    // Фильтруем по городу и типу кузова (без учета регистра)
    const filtered = openCargos.filter(
      (c) =>
        c.originCity.trim().toLowerCase() === currentCity.trim().toLowerCase() &&
        c.bodyType.trim().toLowerCase() === bodyType.trim().toLowerCase()
    );

    // Сортируем: сначала груз, у которого вес ближе всего к грузоподъёмности (capacityTons - weightTons)
    // затем по дате погрузки
    const sorted = filtered.sort((a, b) => {
      const diffA = Math.round((capacityTons - a.weightTons) * 100) / 100;
      const diffB = Math.round((capacityTons - b.weightTons) * 100) / 100;

      if (diffA !== diffB) {
        return diffA - diffB;
      }
      return new Date(a.loadingDate).getTime() - new Date(b.loadingDate).getTime();
    });

    return sorted.map((cargo, index) => ({
      cargo,
      weightDifferenceTons: Math.round((capacityTons - cargo.weightTons) * 10) / 10,
      isBestMatch: index === 0,
    }));
  }

  /**
   * Подбор подходящих водителей для выбранного груза (для диспетчера)
   * Учитывает: кузов, город, тоннаж, статус 'FREE', согласие callConsent
   */
  static async findDriversForCargo(cargoId: string): Promise<MatchingDriverResult[]> {
    const cargo = await prisma.cargo.findUnique({
      where: { id: cargoId },
      include: {
        callLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cargo) {
      return [];
    }

    // Получаем всех активных водителей
    const allDrivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        isBlocked: false,
      },
      include: {
        vehicle: true,
        reviewsReceived: {
          select: { rating: true },
        },
      },
    });

    // Фильтруем: город водителя == город погрузки, кузов совпадает, грузоподъёмность >= вес груза
    const matchingDrivers = allDrivers.filter((driver) => {
      if (!driver.vehicle) return false;
      const cityMatches =
        driver.vehicle.currentCity.trim().toLowerCase() === cargo.originCity.trim().toLowerCase();
      const bodyMatches =
        driver.vehicle.bodyType.trim().toLowerCase() === cargo.bodyType.trim().toLowerCase();
      const capacityMatches = driver.vehicle.capacityTons >= cargo.weightTons;

      return cityMatches && bodyMatches && capacityMatches;
    });

    const results: MatchingDriverResult[] = matchingDrivers.map((driver) => {
      const capacityDiff = Math.round(((driver.vehicle?.capacityTons || 0) - cargo.weightTons) * 10) / 10;
      const latestCall = cargo.callLogs.find((call) => call.driverId === driver.id);

      // Рассчитываем средний рейтинг водителя
      const ratings: number[] = driver.reviewsReceived.map((r) => r.rating);
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
          : 5.0;

      return {
        driver: {
          ...driver,
          avgRating,
          reviewsCount: ratings.length,
        },
        capacityDifferenceTons: capacityDiff,
        callLog: latestCall,
      };
    });

    // Сортировка: наименьший запас по грузоподъёмности (лучшее совпадение)
    return results.sort((a, b) => a.capacityDifferenceTons - b.capacityDifferenceTons);
  }

  /**
   * Получение уведомлений для панели диспетчера
   */
  static async getDispatcherNotifications() {
    const openCargos = await prisma.cargo.findMany({
      where: { status: 'OPEN' },
      include: {
        callLogs: true,
        driverRequests: {
          where: { status: 'PENDING' },
          include: {
            driver: {
              select: { id: true, fullName: true, phone: true },
            },
          },
        },
      },
      take: 20,
    });

    const notifications: Array<{
      id: string;
      type: 'MATCH_FOUND' | 'DRIVER_REQUEST';
      cargoId: string;
      cargoNumber: number;
      driverId: string;
      driverName: string;
      driverPhone: string;
      message: string;
      createdAt: Date;
    }> = [];

    for (const cargo of openCargos) {
      for (const req of cargo.driverRequests) {
        notifications.push({
          id: `req-${req.id}`,
          type: 'DRIVER_REQUEST',
          cargoId: cargo.id,
          cargoNumber: cargo.cargoNumber,
          driverId: req.driver.id,
          driverName: req.driver.fullName,
          driverPhone: req.driver.phone,
          message: `Водитель ${req.driver.fullName} нажал «Беру груз» на рейс #${cargo.cargoNumber} (${cargo.originCity} → ${cargo.destinationCity}). Срочно позвоните ему!`,
          createdAt: req.createdAt,
        });
      }
    }

    for (const cargo of openCargos) {
      const matches = await this.findDriversForCargo(cargo.id);
      for (const match of matches) {
        const agreedCall = cargo.callLogs.find(
          (c) => c.driverId === match.driver.id && c.outcome === 'AGREED'
        );
        if (!agreedCall) {
          notifications.push({
            id: `match-${cargo.id}-${match.driver.id}`,
            type: 'MATCH_FOUND',
            cargoId: cargo.id,
            cargoNumber: cargo.cargoNumber,
            driverId: match.driver.id,
            driverName: match.driver.fullName,
            driverPhone: match.driver.phone,
            message: `Есть груз #${cargo.cargoNumber} (${cargo.originCity} → ${cargo.destinationCity}, ${cargo.weightTons} т) для водителя ${match.driver.fullName}, позвоните ему.`,
            createdAt: cargo.createdAt,
          });
        }
      }
    }

    return notifications.slice(0, 30);
  }
}
