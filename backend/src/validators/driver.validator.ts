import { z } from 'zod';
import { normalizePhone, isValidE164Phone } from '../utils/phone.js';

export const createDriverSchema = z.object({
  fullName: z
    .string({ required_error: 'ФИО водителя обязательно' })
    .min(3, 'ФИО должно содержать минимум 3 символа')
    .trim(),
  phone: z
    .string({ required_error: 'Номер телефона обязателен' })
    .transform((val) => normalizePhone(val))
    .refine((val) => isValidE164Phone(val), {
      message: 'Телефон должен быть в формате E.164 (+77011234567, Казахстан/РФ, без пробелов и скобок)',
    }),
  login: z
    .string({ required_error: 'Логин обязателен' })
    .min(3, 'Логин должен содержать не менее 3 символов')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Логин может содержать только латинские буквы, цифры и знаки _ . -')
    .trim(),
  password: z
    .string({ required_error: 'Пароль обязателен' })
    .min(4, 'Пароль должен быть не менее 4 символов'),
  callConsent: z.boolean().optional().default(true),
  workStatus: z.enum(['FREE', 'IN_TRIP', 'RESTING']).optional().default('FREE'),
  vehicle: z.object({
    capacityTons: z
      .number({ required_error: 'Укажите грузоподъёмность в тоннах' })
      .positive('Грузоподъёмность должна быть больше 0')
      .max(60, 'Максимальная грузоподъёмность 60 тонн'),
    bodyType: z
      .string({ required_error: 'Выберите тип кузова' })
      .min(2, 'Тип кузова обязателен'),
    currentCity: z
      .string({ required_error: 'Укажите город дислокации' })
      .min(2, 'Город обязателен'),
    plateNumber: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
  }),
});

export const updateVehicleSchema = z.object({
  capacityTons: z
    .number({ required_error: 'Укажите грузоподъёмность' })
    .positive('Грузоподъёмность должна быть больше 0')
    .max(60, 'Максимальная грузоподъёмность 60 тонн'),
  bodyType: z
    .string({ required_error: 'Укажите тип кузова' })
    .min(2, 'Тип кузова обязателен'),
  currentCity: z
    .string({ required_error: 'Укажите город дислокации' })
    .min(2, 'Город обязателен'),
  plateNumber: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
});

export const updateWorkStatusSchema = z.object({
  workStatus: z.enum(['FREE', 'IN_TRIP', 'RESTING'], {
    errorMap: () => ({ message: 'Статус водителя должен быть: FREE (свободен), IN_TRIP (в рейсе) или RESTING (отдыхает)' }),
  }),
});

export const updateCallConsentSchema = z.object({
  callConsent: z.boolean({ required_error: 'Укажите согласие на звонки' }),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(4, 'Новый пароль должен содержать минимум 4 символа')
    .optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
