import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[DELLA Server Error]:', err);

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: formattedErrors[0]?.message || 'Ошибка валидации данных',
      details: formattedErrors,
    });
    return;
  }

  // Handle Prisma known errors
  if (err.code === 'P2002') {
    res.status(409).json({
      success: false,
      error: 'Запись с такими уникальными данными (например, логин) уже существует в системе.',
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      error: 'Запрашиваемая запись не найдена в базе данных.',
    });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.',
  });
};

