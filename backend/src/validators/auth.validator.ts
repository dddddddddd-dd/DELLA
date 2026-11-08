import { z } from 'zod';

export const loginSchema = z.object({
  login: z
    .string({ required_error: 'Логин обязателен для заполнения' })
    .min(3, 'Логин должен содержать не менее 3 символов')
    .trim(),
  password: z
    .string({ required_error: 'Пароль обязателен для заполнения' })
    .min(4, 'Пароль должен содержать не менее 4 символов'),
});

export type LoginInput = z.infer<typeof loginSchema>;

