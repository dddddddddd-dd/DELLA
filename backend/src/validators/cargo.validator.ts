import { z } from 'zod';

export const createCargoSchema = z.object({
  originCity: z
    .string({ required_error: 'Укажите город погрузки' })
    .min(2, 'Город погрузки обязателен'),
  destinationCity: z
    .string({ required_error: 'Укажите город выгрузки' })
    .min(2, 'Город выгрузки обязателен'),
  weightTons: z
    .number({ required_error: 'Укажите вес груза в тоннах' })
    .positive('Вес груза должен быть больше 0')
    .max(60, 'Максимальный вес груза 60 тонн'),
  bodyType: z
    .string({ required_error: 'Выберите необходимый тип кузова' })
    .min(2, 'Тип кузова обязателен'),
  loadingDate: z
    .string({ required_error: 'Укажите дату погрузки' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Некорректная дата погрузки',
    }),
  rateKzt: z
    .number({ required_error: 'Укажите ставку в тенге' })
    .int('Ставка должна быть целым числом')
    .positive('Ставка должна быть больше 0'),
  rateStatus: z
    .enum(['CONFIRMED', 'PENDING'], {
      errorMap: () => ({ message: 'Статус ставки должен быть CONFIRMED или PENDING' }),
    })
    .default('CONFIRMED'),
  customerName: z
    .string({ required_error: 'Укажите контактное лицо заказчика' })
    .min(2, 'Имя заказчика обязательно'),
  customerPhone: z
    .string({ required_error: 'Укажите телефон заказчика' })
    .min(10, 'Укажите корректный номер телефона заказчика'),
  customerCompany: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const updateCargoSchema = createCargoSchema.partial();

export const changeRateSchema = z.object({
  newRate: z
    .number({ required_error: 'Укажите новую ставку в тенге' })
    .int('Ставка должна быть целым числом')
    .positive('Ставка должна быть больше 0'),
  reason: z
    .string({ required_error: 'Укажите причину изменения ставки' })
    .min(3, 'Причина изменения ставки должна содержать минимум 3 символа'),
});

export const updateCargoStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Некорректный статус груза' }),
  }),
  driverId: z.string().optional().nullable(),
});

export type CreateCargoInput = z.infer<typeof createCargoSchema>;
export type ChangeRateInput = z.infer<typeof changeRateSchema>;

