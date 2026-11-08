import { z } from 'zod';

export const createComplaintSchema = z.object({
  reason: z
    .string({ required_error: 'Укажите причину жалобы' })
    .min(3, 'Причина должна содержать не менее 3 символов'),
  comment: z
    .string({ required_error: 'Опишите подробно ситуацию' })
    .min(5, 'Комментарий должен содержать не менее 5 символов'),
  targetDriverId: z.string().optional().nullable(),
  targetCargoId: z.string().optional().nullable(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED'], {
    errorMap: () => ({ message: 'Статус должен быть: NEW, IN_PROGRESS или RESOLVED' }),
  }),
  resolution: z.string().optional().nullable(),
});

export const createReviewSchema = z.object({
  cargoId: z.string({ required_error: 'ID груза обязателен' }),
  targetUserId: z.string().optional().nullable(),
  rating: z
    .number({ required_error: 'Оценка обязательна' })
    .int('Оценка должна быть целым числом')
    .min(1, 'Минимальная оценка 1')
    .max(5, 'Максимальная оценка 5'),
  comment: z.string().optional().nullable(),
});

export const callLogSchema = z.object({
  cargoId: z.string({ required_error: 'ID груза обязателен' }),
  driverId: z.string({ required_error: 'ID водителя обязателен' }),
  outcome: z.enum(['AGREED', 'DECLINED', 'NO_ANSWER'], {
    errorMap: () => ({ message: 'Результат звонка должен быть AGREED, DECLINED или NO_ANSWER' }),
  }),
  comment: z.string().optional().nullable(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CallLogInput = z.infer<typeof callLogSchema>;

