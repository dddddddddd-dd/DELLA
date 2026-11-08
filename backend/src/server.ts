import { createApp } from './app.js';
import { config, prisma } from './config/index.js';

const app = createApp();

const startServer = async () => {
  try {
    // Проверяем подключение к базе данных
    await prisma.$connect();
    console.log('✅ База данных DELLA успешно подключена');

    app.listen(config.port, () => {
      console.log(`🚀 Сервер DELLA запущен на порту http://localhost:${config.port}`);
      console.log(`📍 API доступно по адресу: http://localhost:${config.port}/api`);
    });
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
};

startServer();

