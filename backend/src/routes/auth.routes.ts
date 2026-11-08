import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, config } from '../config/index.js';
import { loginSchema } from '../validators/auth.validator.js';
import { loginRateLimiter } from '../middleware/rate-limit.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { login: validated.login },
      include: {
        vehicle: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль. Проверьте правильность введённых данных.',
      });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        error: 'Ваша учётная запись заблокирована диспетчером. Свяжитесь со службой поддержки.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(validated.password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль. Проверьте правильность введённых данных.',
      });
      return;
    }

    // Создаём JWT токен
    const token = jwt.sign(
      {
        id: user.id,
        login: user.login,
        role: user.role,
        fullName: user.fullName,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Логируем успешный вход
    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      details: `Успешный вход в систему под ролью ${user.role === 'DISPATCHER' ? 'Диспетчер' : 'Водитель'}`,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.json({
      success: true,
      message: 'Успешный вход в систему',
      token,
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        vehicle: user.vehicle,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        vehicle: true,
        reviewsReceived: {
          select: { rating: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Пользователь не найден.',
      });
      return;
    }

    const ratings = user.reviewsReceived.map((r) => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 5.0;

    res.json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        isBlocked: user.isBlocked,
        vehicle: user.vehicle,
        avgRating,
        reviewsCount: ratings.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

