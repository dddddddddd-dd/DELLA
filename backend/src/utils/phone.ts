/**
 * Валидация и нормализация номеров телефонов в международный формат E.164 (+7XXXXXXXXXX)
 * Разрешены только форматы Казахстана и РФ (+7)
 */

export const E164_PHONE_REGEX = /^\+7[0-9]{10}$/;

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  
  // Убираем пробелы, скобки, тире
  let cleaned = rawPhone.trim().replace(/[\s\(\)\-\.]/g, '');
  
  // Если начинается с 8 (например, 87011234567) -> заменяем на +7
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    cleaned = '+7' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 11) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length === 10) {
    cleaned = '+7' + cleaned;
  }
  
  return cleaned;
}

export function isValidE164Phone(phone: string): boolean {
  return E164_PHONE_REGEX.test(phone);
}

