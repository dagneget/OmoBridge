import { describe, it, expect } from 'vitest';
import {
  formatETB,
  roundCurrency,
  toCents,
  fromCents,
  formatQuantity,
  formatDateTime,
  formatRelativeTime,
  getStatusI18nKey,
  formatStatusLabel,
} from '../utils/formatters';

describe('Formatting Utilities (F-104)', () => {
  describe('ETB Currency & Decimal Safety', () => {
    it('formats standard birr amounts with commas and 2 decimal places', () => {
      expect(formatETB(1500)).toBe('1,500.00 ETB');
      expect(formatETB(25.5)).toBe('25.50 ETB');
      expect(formatETB('10450.75')).toBe('10,450.75 ETB');
      expect(formatETB(0)).toBe('0.00 ETB');
    });

    it('handles negative numbers properly', () => {
      expect(formatETB(-1250)).toBe('-1,250.00 ETB');
      expect(formatETB(-0.5)).toBe('-0.50 ETB');
    });

    it('handles edge cases (null, undefined, NaN, empty string)', () => {
      expect(formatETB(null)).toBe('0.00 ETB');
      expect(formatETB(undefined)).toBe('0.00 ETB');
      expect(formatETB(NaN)).toBe('0.00 ETB');
      expect(formatETB('')).toBe('0.00 ETB');
      expect(formatETB('invalid')).toBe('0.00 ETB');
    });

    it('respects options for hiding decimals and custom currency code', () => {
      expect(formatETB(1200, { showDecimals: false })).toBe('1,200 ETB');
      expect(formatETB(500, { currencyCode: 'USD' })).toBe('500.00 USD');
      expect(formatETB(500, { showSymbol: false })).toBe('500.00');
    });

    it('safely rounds decimal values and converts to/from cents without float errors', () => {
      // 0.1 + 0.2 floating point anomaly
      const sum = 0.1 + 0.2; // 0.30000000000000004 in raw JS
      expect(roundCurrency(sum)).toBe(0.3);
      expect(toCents(12.34)).toBe(1234);
      expect(fromCents(1234)).toBe(12.34);
    });
  });

  describe('Quantity and Unit Formatting', () => {
    it('formats numbers with units and handles singular/plural properly', () => {
      expect(formatQuantity(1, 'bottle')).toBe('1 bottle');
      expect(formatQuantity(5, 'bottle')).toBe('5 bottles');
      expect(formatQuantity(25, 'kg')).toBe('25 kg');
      expect(formatQuantity(100, 'qtl')).toBe('100 qtl');
      expect(formatQuantity(1, 'piece')).toBe('1 piece');
      expect(formatQuantity(12, 'piece')).toBe('12 pieces');
    });

    it('formats fractional quantities with decimals', () => {
      expect(formatQuantity(2.5, 'kg')).toBe('2.5 kg');
      expect(formatQuantity(0.75, 'liters')).toBe('0.75 liters');
    });

    it('handles null and undefined quantities', () => {
      expect(formatQuantity(null, 'kg')).toBe('0 kg');
      expect(formatQuantity(undefined, 'kg')).toBe('0 kg');
      expect(formatQuantity(null, undefined, { includeUnit: false })).toBe('0');
    });
  });

  describe('Date and Time (Africa/Addis_Ababa, UTC+3)', () => {
    // 2026-10-18T06:30:00Z in UTC is 2026-10-18T09:30:00 in Addis Ababa (UTC+3)
    const utcDateStr = '2026-10-18T06:30:00Z';

    it('formats UTC timestamp in Africa/Addis_Ababa timezone (UTC+3)', () => {
      const formatted = formatDateTime(utcDateStr, 'medium');
      expect(formatted).toContain('Oct 18, 2026');
      expect(formatted).toContain('09:30 AM');
    });

    it('formats dateOnly and timeOnly correctly', () => {
      expect(formatDateTime(utcDateStr, 'dateOnly')).toBe('Oct 18, 2026');
      expect(formatDateTime(utcDateStr, 'timeOnly')).toBe('09:30 AM');
    });

    it('formats short format in 24h format', () => {
      const short = formatDateTime(utcDateStr, 'short');
      expect(short).toContain('09:30');
    });

    it('handles relative time calculation', () => {
      const now = new Date('2026-10-18T12:00:00Z');
      const tenSecondsAgo = new Date('2026-10-18T11:59:50Z');
      const fiveMinutesAgo = new Date('2026-10-18T11:55:00Z');
      const twoHoursAgo = new Date('2026-10-18T10:00:00Z');
      const yesterday = new Date('2026-10-17T12:00:00Z');

      expect(formatRelativeTime(tenSecondsAgo, now)).toBe('just now');
      expect(formatRelativeTime(fiveMinutesAgo, now)).toBe('5 minutes ago');
      expect(formatRelativeTime(twoHoursAgo, now)).toBe('2 hours ago');
      expect(formatRelativeTime(yesterday, now)).toBe('yesterday');
    });

    it('returns fallback dash for invalid or null dates', () => {
      expect(formatDateTime(null)).toBe('-');
      expect(formatDateTime(undefined)).toBe('-');
      expect(formatDateTime('invalid-date-string')).toBe('-');
    });
  });

  describe('Status Labels & i18n Keys', () => {
    it('derives hierarchical i18n key from status string', () => {
      expect(getStatusI18nKey('PENDING')).toBe('status.pending');
      expect(getStatusI18nKey('IN_TRANSIT')).toBe('status.in_transit');
      expect(getStatusI18nKey('CONFIRMED')).toBe('status.confirmed');
      expect(getStatusI18nKey('')).toBe('status.unknown');
    });

    it('formats status enums to title case display text', () => {
      expect(formatStatusLabel('PENDING')).toBe('Pending');
      expect(formatStatusLabel('IN_TRANSIT')).toBe('In Transit');
      expect(formatStatusLabel('OUT_OF_STOCK')).toBe('Out Of Stock');
      expect(formatStatusLabel(null, 'Not Available')).toBe('Not Available');
    });
  });
});
