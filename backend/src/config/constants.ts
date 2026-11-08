export const KZ_CITIES = [
  'Алматы',
  'Астана',
  'Шымкент',
  'Караганда',
  'Актобе',
  'Тараз',
  'Павлодар',
  'Усть-Каменогорск',
  'Семей',
  'Атырау',
  'Костанай',
  'Кызылорда',
  'Уральск',
  'Петропавловск',
  'Актау',
  'Темиртау',
  'Туркестан',
  'Кокшетау',
  'Талдыкорган',
  'Экибастуз',
] as const;

export const BODY_TYPES = [
  'Тент',
  'Рефрижератор',
  'Борт',
  'Контейнеровоз',
  'Самосвал',
  'Изотермический',
  'Цельнометаллический',
  'Цистерна',
] as const;

export const CARGO_STATUSES = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const RATE_STATUSES = {
  CONFIRMED: 'CONFIRMED',
  PENDING: 'PENDING',
} as const;

export const CALL_OUTCOMES = {
  AGREED: 'AGREED',
  DECLINED: 'DECLINED',
  NO_ANSWER: 'NO_ANSWER',
} as const;

export const COMPLAINT_STATUSES = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;

export const ROLES = {
  DRIVER: 'DRIVER',
  DISPATCHER: 'DISPATCHER',
} as const;

