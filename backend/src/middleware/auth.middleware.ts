import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, prisma } from '../config/index.js';

export interface AuthUser {
  id: string;
  login: string;
  role: 'DRIVER' | 'DISPATCHER';
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Требуется авторизация. Войдите в систему под своей учётной записью.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      login: string;
      role: 'DRIVER' | 'DISPATCHER';
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        login: true,
        role: true,
        fullName: true,
        isBlocked: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Пользователь не найден в системе.',
      });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        error: 'Ваша учётная запись заблокирована диспетчером. Обратитесь в службу поддержки DELLA.',
      });
      return;
    }

    req.user = {
      id: user.id,
      login: user.login,
      role: user.role as 'DRIVER' | 'DISPATCHER',
      fullName: user.fullName,
    };

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Сессия устарела или недействительна. Пожалуйста, выполните вход заново.',
    });
  }
};

