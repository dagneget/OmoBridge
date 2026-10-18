/**
 * Formatting utilities for ETB currency, quantities, UTC to Africa/Addis_Ababa date/time, and status labels.
 */

export const ETHIOPIA_TIMEZONE = 'Africa/Addis_Ababa';

/**
 * Decimal-safe rounding for financial amounts to 2 decimal places.
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Converts ETB birr amount to cents (integer)
 */
export function toCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

/**
 * Converts cents (integer) to ETB birr amount
 */
export function fromCents(cents: number): number {
  return roundCurrency(cents / 100);
}

export interface FormatETBOptions {
  showDecimals?: boolean;
  currencyCode?: string; // default 'ETB'
  showSymbol?: boolean; // default true
}

/**
 * Formats a number or string into ETB currency representation (e.g. "1,250.00 ETB").
 * Safe against NaN, null, undefined, and exponential numbers.
 */
export function formatETB(
  amount: number | string | null | undefined,
  options: FormatETBOptions = {}
): string {
  const { showDecimals = true, currencyCode = 'ETB', showSymbol = true } = options;

  if (amount === null || amount === undefined || amount === '') {
    return showSymbol ? `0.00 ${currencyCode}` : '0.00';
  }

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || !isFinite(num)) {
    return showSymbol ? `0.00 ${currencyCode}` : '0.00';
  }

  const rounded = roundCurrency(num);
  const isNegative = rounded < 0;
  const absNum = Math.abs(rounded);

  const parts = absNum.toFixed(showDecimals ? 2 : 0).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = showDecimals && parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart;

  const sign = isNegative ? '-' : '';
  return showSymbol ? `${sign}${formattedNumber} ${currencyCode}` : `${sign}${formattedNumber}`;
}

export interface FormatQuantityOptions {
  includeUnit?: boolean;
}

/**
 * Formats a product or inventory quantity with unit (e.g. "25 kg", "1 bottle", "3 bottles").
 */
export function formatQuantity(
  quantity: number | string | null | undefined,
  unit?: string,
  options: FormatQuantityOptions = { includeUnit: true }
): string {
  if (quantity === null || quantity === undefined || quantity === '') {
    return unit && options.includeUnit ? `0 ${unit}` : '0';
  }

  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (isNaN(num) || !isFinite(num)) {
    return unit && options.includeUnit ? `0 ${unit}` : '0';
  }

  // Format with up to 2 decimal places if non-integer, otherwise integer
  const formattedNum = Number.isInteger(num)
    ? num.toLocaleString('en-US')
    : (Math.round((num + Number.EPSILON) * 100) / 100).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });

  if (!unit || !options.includeUnit) {
    return formattedNum;
  }

  const cleanUnit = unit.trim().toLowerCase();
  // Standard pluralization for English units
  const pluralizableUnits = ['piece', 'bag', 'bottle', 'box', 'package', 'bunch', 'carton'];
  if (pluralizableUnits.includes(cleanUnit) && num !== 1) {
    return `${formattedNum} ${cleanUnit}s`;
  }

  return `${formattedNum} ${unit.trim()}`;
}

export type DateTimeFormatType = 'short' | 'medium' | 'long' | 'dateOnly' | 'timeOnly' | 'relative';

/**
 * Formats a UTC date string, timestamp, or Date object in Africa/Addis_Ababa timezone (EAT = UTC+3).
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  type: DateTimeFormatType = 'medium',
  referenceNow: Date = new Date()
): string {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  if (type === 'relative') {
    return formatRelativeTime(date, referenceNow);
  }

  const optionsMap: Record<Exclude<DateTimeFormatType, 'relative'>, Intl.DateTimeFormatOptions> = {
    short: {
      timeZone: ETHIOPIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    medium: {
      timeZone: ETHIOPIA_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    },
    long: {
      timeZone: ETHIOPIA_TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      hour12: true,
    },
    dateOnly: {
      timeZone: ETHIOPIA_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    timeOnly: {
      timeZone: ETHIOPIA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    },
  };

  const options = optionsMap[type];
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Formats relative time from a given reference timestamp
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 30) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDateTime(date, 'dateOnly');
}

/**
 * Returns i18n translation key for a given system status
 */
export function getStatusI18nKey(status: string): string {
  if (!status) return 'status.unknown';
  return `status.${status.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
}

/**
 * Formats an enum status string into user-friendly title case (e.g. "IN_TRANSIT" -> "In Transit")
 */
export function formatStatusLabel(status: string | null | undefined, fallback = 'Unknown'): string {
  if (!status) return fallback;
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
