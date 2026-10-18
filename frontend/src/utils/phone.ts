import { z } from 'zod';

/**
 * Normalizes user input into canonical E.164 Ethiopian phone format (+2519XXXXXXXX or +2517XXXXXXXX)
 */
export function normalizeEthiopianPhone(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.trim().replace(/[\s\-().]/g, '');

  if (/^0[79]\d{8}$/.test(cleaned)) {
    return `+251${cleaned.slice(1)}`;
  }
  if (/^[79]\d{8}$/.test(cleaned)) {
    return `+251${cleaned}`;
  }
  if (/^251[79]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^\+251[79]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Validates whether the given string represents an Ethiopian mobile number
 */
export function isValidEthiopianPhone(raw: string): boolean {
  const normalized = normalizeEthiopianPhone(raw);
  return /^\+251[79]\d{8}$/.test(normalized);
}

/**
 * Formats a phone number for user-friendly display (+251 9XX XXX XXX)
 */
export function formatEthiopianPhoneDisplay(raw: string): string {
  const norm = normalizeEthiopianPhone(raw);
  if (/^\+251[79]\d{8}$/.test(norm)) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 6)} ${norm.slice(6, 9)} ${norm.slice(9)}`;
  }
  return raw;
}

/**
 * Zod schema for validating Ethiopian phone numbers and transforming to canonical format
 */
export const ethiopianPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine(isValidEthiopianPhone, {
    message: 'Please enter a valid Ethiopian phone number (e.g., 0911234567 or +251 91 123 4567)',
  })
  .transform(normalizeEthiopianPhone);
