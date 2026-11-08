import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Наполняем базу данных DELLA с модулем автоматических звонков...');

  // Очистка таблиц перед сидом
  await prisma.auditLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.callAttempt.deleteMany();
  await prisma.driverCargoRequest.deleteMany();
  await prisma.rateChangeHistory.deleteMany();
  await prisma.cargo.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  console.log('🧹 Таблицы очищены');

  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const driverPasswordHash = await bcrypt.hash('driver123', 10);

  // 1. Инициализация глобальных настроек системы
  await prisma.systemSetting.createMany({
    data: [
      { key: 'AUTO_CALL_ENABLED', value: 'true' },
      { key: 'ESCALATION_MINUTES', value: '10' },
      { key: 'MAX_CALLS_PER_HOUR', value: '3' },
    ],
  });

  // 2. Создаем диспетчера / администратора
  const dispatcher = await prisma.user.create({
    data: {
      login: 'dispatcher',
      password: defaultPasswordHash,
      issuedPassword: 'password123',
      role: 'DISPATCHER',
      fullName: 'Алихан Сатпаев (Старший диспетчер)',
      phone: '+77015550101', // Валидный формат E.164
    },
  });
  console.log('👤 Диспетчер создан: login="dispatcher", pass="password123"');

  // 3. Создаем 3 водителей с валидными номерами E.164, согласием на звонки и статусом "FREE"
  const driver1 = await prisma.user.create({
    data: {
      login: 'driver_erbol',
      password: driverPasswordHash,
      issuedPassword: 'driver123',
      role: 'DRIVER',
      fullName: 'Ербол Сериков',
      phone: '+77771234567', // E.164
      callConsent: true,
      callConsentAt: new Date(),
      workStatus: 'FREE',
      vehicle: {
        create: {
          capacityTons: 15.0,
          bodyType: 'Тент',
          currentCity: 'Шымкент',
          plateNumber: '777 KZ 13',
          model: 'DAF XF 105',
        },
      },
    },
    include: { vehicle: true },
  });

  const driver2 = await prisma.user.create({
    data: {
      login: 'driver_kairat',
      password: driverPasswordHash,
      issuedPassword: 'driver123',
      role: 'DRIVER',
      fullName: 'Кайрат Нуртасов',
      phone: '+77029876543', // E.164
      callConsent: true,
      callConsentAt: new Date(),
      workStatus: 'FREE',
      vehicle: {
        create: {
          capacityTons: 20.0,
          bodyType: 'Рефрижератор',
          currentCity: 'Алматы',
          plateNumber: '555 AB 02',
          model: 'Volvo FH 13',
        },
      },
    },
    include: { vehicle: true },
  });

  const driver3 = await prisma.user.create({
    data: {
      login: 'driver_alex',
      password: driverPasswordHash,
      issuedPassword: 'driver123',
      role: 'DRIVER',
      fullName: 'Алексей Смирнов',
      phone: '+77054567890', // E.164
      callConsent: true,
      callConsentAt: new Date(),
      workStatus: 'FREE',
      vehicle: {
        create: {
          capacityTons: 10.0,
          bodyType: 'Борт',
          currentCity: 'Астана',
          plateNumber: '123 AST 01',
          model: 'KamAZ 5490',
        },
      },
    },
    include: { vehicle: true },
  });

  console.log('🚛 Созданы 3 водителя с согласием на автозвонки (callConsent = true, workStatus = "FREE")');

  // 4. Создаем грузы
  const now = new Date();

  const cargo1 = await prisma.cargo.create({
    data: {
      cargoNumber: 101,
      originCity: 'Шымкент',
      destinationCity: 'Астана',
      weightTons: 14.0,
      bodyType: 'Тент',
      loadingDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      rateKzt: 650000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Бауыржан Мусин',
      customerPhone: '+77783001122',
      customerCompany: 'ТОО "Азия Логистик Групп"',
      description: 'Строительные материалы на поддонах, боковая и задняя загрузка. Оплата сразу по оригиналам ТТН.',
    },
  });

  await prisma.rateChangeHistory.create({
    data: {
      cargoId: cargo1.id,
      oldRate: 600000,
      newRate: 650000,
      reason: 'Согласована доплата от заказчика за срочность подачи машины',
      changedById: dispatcher.id,
    },
  });

  // Создаем образец попытки автозвонка для груза 101 для демонстрации в мониторинге
  await prisma.callAttempt.create({
    data: {
      loadId: cargo1.id,
      driverId: driver1.id,
      provider: 'mock',
      providerCallId: 'mock_sample_101',
      status: 'accepted',
      attemptNumber: 1,
      cargoCreatedAt: cargo1.createdAt,
      callInitiatedAt: new Date(cargo1.createdAt.getTime() + 850),
      latencyMs: 850, // 850 мс < 3000 мс!
      startedAt: new Date(cargo1.createdAt.getTime() + 900),
      answeredAt: new Date(cargo1.createdAt.getTime() + 4500),
      endedAt: new Date(cargo1.createdAt.getTime() + 18000),
      dtmfKey: '1',
    },
  });

  const cargo2 = await prisma.cargo.create({
    data: {
      cargoNumber: 102,
      originCity: 'Шымкент',
      destinationCity: 'Алматы',
      weightTons: 8.0,
      bodyType: 'Тент',
      loadingDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      rateKzt: 380000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Азамат Калиев',
      customerPhone: '+77754443322',
      customerCompany: 'ТОО "Шымкент Текстиль"',
      description: 'Ткани и швейная фурнитура в коробках, чистый сухой кузов.',
    },
  });

  const cargo3 = await prisma.cargo.create({
    data: {
      cargoNumber: 103,
      originCity: 'Алматы',
      destinationCity: 'Караганда',
      weightTons: 19.5,
      bodyType: 'Рефрижератор',
      loadingDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      rateKzt: 950000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Тимур Жангиров',
      customerPhone: '+77017778899',
      customerCompany: 'ТОО "Фуд Мастер Дистрибьюшн"',
      description: 'Молочная продукция, температурный режим +2...+4°C. Погрузка рампа.',
    },
  });

  const cargo4 = await prisma.cargo.create({
    data: {
      cargoNumber: 104,
      originCity: 'Алматы',
      destinationCity: 'Шымкент',
      weightTons: 18.0,
      bodyType: 'Рефрижератор',
      loadingDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      rateKzt: 620000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Динара Каримова',
      customerPhone: '+77075554411',
      customerCompany: 'ТОО "Алматы ПлодСервис"',
      description: 'Свежие яблоки в деревянных ящиках, режим +4°C.',
    },
  });

  const cargo5 = await prisma.cargo.create({
    data: {
      cargoNumber: 105,
      originCity: 'Астана',
      destinationCity: 'Костанай',
      weightTons: 9.5,
      bodyType: 'Борт',
      loadingDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      rateKzt: 450000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Сергей Николаев',
      customerPhone: '+77712223344',
      customerCompany: 'АО "Астана Сталь"',
      description: 'Металлопрокат и арматура 6 м, верхняя погрузка краном, ремни обязательны.',
    },
  });

  const cargo6 = await prisma.cargo.create({
    data: {
      cargoNumber: 106,
      originCity: 'Астана',
      destinationCity: 'Павлодар',
      weightTons: 5.0,
      bodyType: 'Борт',
      loadingDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      rateKzt: 270000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Мурат Искаков',
      customerPhone: '+77023334455',
      customerCompany: 'ТОО "Павлодар СпецСнаб"',
      description: 'Железобетонные перемычки, верхняя погрузка.',
    },
  });

  const cargo7 = await prisma.cargo.create({
    data: {
      cargoNumber: 107,
      originCity: 'Караганда',
      destinationCity: 'Алматы',
      weightTons: 22.0,
      bodyType: 'Тент',
      loadingDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      rateKzt: 750000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Нурлан Омаров',
      customerPhone: '+77059990011',
      customerCompany: 'ТОО "Сарыарка Трейд"',
      description: 'Сухие строительные смеси на паллетах.',
    },
  });

  const cargo8 = await prisma.cargo.create({
    data: {
      cargoNumber: 108,
      originCity: 'Актобе',
      destinationCity: 'Атырау',
      weightTons: 12.0,
      bodyType: 'Тент',
      loadingDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      rateKzt: 480000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Ержан Куанышев',
      customerPhone: '+77761112233',
      customerCompany: 'ТОО "Запад Логистик"',
      description: 'Промышленное оборудование в ящиках.',
    },
  });

  const cargo9 = await prisma.cargo.create({
    data: {
      cargoNumber: 109,
      originCity: 'Шымкент',
      destinationCity: 'Тараз',
      weightTons: 16.0,
      bodyType: 'Тент',
      loadingDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      rateKzt: 220000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Гульнара Бекова',
      customerPhone: '+77086667788',
      customerCompany: 'ТОО "Юг Консерв"',
      description: 'Консервная продукция в упаковках.',
    },
  });

  const cargo10 = await prisma.cargo.create({
    data: {
      cargoNumber: 110,
      originCity: 'Алматы',
      destinationCity: 'Усть-Каменогорск',
      weightTons: 15.0,
      bodyType: 'Рефрижератор',
      loadingDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      rateKzt: 890000,
      rateStatus: 'CONFIRMED',
      status: 'OPEN',
      autoCallEnabled: true,
      customerName: 'Владимир Ким',
      customerPhone: '+77014448877',
      customerCompany: 'ТОО "Восток Ритейл"',
      description: 'Замороженная птица, режим -18°C.',
    },
  });

  // Завершённый рейс
  const pastCargo = await prisma.cargo.create({
    data: {
      cargoNumber: 99,
      originCity: 'Шымкент',
      destinationCity: 'Астана',
      weightTons: 13.5,
      bodyType: 'Тент',
      loadingDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      rateKzt: 620000,
      rateStatus: 'CONFIRMED',
      status: 'COMPLETED',
      assignedDriverId: driver1.id,
      customerName: 'Бауыржан Мусин',
      customerPhone: '+77783001122',
      customerCompany: 'ТОО "Азия Логистик Групп"',
      description: 'Успешно доставленный груз. Быстрая разгрузка.',
    },
  });

  await prisma.review.create({
    data: {
      cargoId: pastCargo.id,
      authorId: driver1.id,
      rating: 5,
      comment: 'Отличный заказчик! Быстро загрузили, документы выдали без задержек.',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: dispatcher.id,
      action: 'SYSTEM_INIT',
      details: 'Инициализация системы DELLA с модулем автоматических звонков',
    },
  });

  console.log('✅ База данных DELLA успешно заполнена тестовыми данными и историей звонков!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сида:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
