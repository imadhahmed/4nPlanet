// tests/format.test.js
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  paymentStatusBadge,
  saleStatusBadge,
  repairStatusBadge,
  repairStatusLabel
} from '../src/utils/format.js';

describe('Format Utilities', () => {
  it('formats currency in Sri Lankan Rupees (LKR)', () => {
    const formatted = formatCurrency(150000);
    expect(formatted).toContain('150,000.00');
  });

  it('handles zero and null currency values safely', () => {
    expect(formatCurrency(0)).toContain('0.00');
    expect(formatCurrency(null)).toContain('0.00');
    expect(formatCurrency(undefined)).toContain('0.00');
  });

  it('formats numbers with proper decimal precision', () => {
    expect(formatNumber(1250)).toBe('1,250');
    expect(formatNumber(1250.555, 2)).toBe('1,250.56');
  });

  it('maps payment status badges accurately', () => {
    expect(paymentStatusBadge('paid')).toBe('badge-green');
    expect(paymentStatusBadge('partial')).toBe('badge-amber');
    expect(paymentStatusBadge('unpaid')).toBe('badge-red');
    expect(paymentStatusBadge('unknown')).toBe('badge-gray');
  });

  it('maps sale status badges accurately', () => {
    expect(saleStatusBadge('completed')).toBe('badge-green');
    expect(saleStatusBadge('cancelled')).toBe('badge-red');
    expect(saleStatusBadge('returned')).toBe('badge-amber');
  });

  it('maps repair statuses and labels properly', () => {
    expect(repairStatusBadge('in_progress')).toBe('badge-cyan');
    expect(repairStatusBadge('ready')).toBe('badge-green');
    expect(repairStatusLabel('waiting_parts')).toBe('Waiting for Parts');
    expect(repairStatusLabel('collected')).toBe('Collected');
  });
});
