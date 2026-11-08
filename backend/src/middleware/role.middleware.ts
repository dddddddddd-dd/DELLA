import { Request, Response, NextFunction } from 'express';

export const requireRole = (...roles: ('DRIVER' | 'DISPATCHER')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Требуется авторизация.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Доступ запрещён. У вашей роли нет прав для выполнения этой операции.',
      });
      return;
    }

    next();
  };
};

