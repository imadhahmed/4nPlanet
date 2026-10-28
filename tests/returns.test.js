// tests/returns.test.js
import { describe, it, expect } from 'vitest';
import { ProcessReturnSchema } from '../api/lib/validate.js';
import { returnTypeBadge, saleStatusBadge } from '../src/utils/format.js';

describe('Returns & Exchanges Validation', () => {
  it('validates a valid same-product exchange payload', () => {
    const payload = {
      sale_id: 'SALE-000001',
      return_type: 'exchange_same',
      returned_item: {
        product_id: 'PROD-000001',
        quantity: 1,
        condition: 'restock',
        serial_id: 'SER-000001',
        imei1: '354892109823412',
      },
      exchange_item: {
        product_id: 'PROD-000001',
        quantity: 1,
      },
      reason: 'Defective screen flickering',
      refund_amount: 0,
      difference_amount: 0,
    };

    const parsed = ProcessReturnSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates a valid different-product exchange payload with price difference', () => {
    const payload = {
      sale_id: 'SALE-000001',
      return_type: 'exchange_diff',
      returned_item: {
        product_id: 'PROD-000003',
        quantity: 2,
        condition: 'restock',
      },
      exchange_item: {
        product_id: 'PROD-000004',
        quantity: 1,
      },
      reason: 'Customer preferred upgrade model',
      difference_amount: 32000,
      payment_method: 'card',
      reference_number: 'CARD-AUTH-9821',
    };

    const parsed = ProcessReturnSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates a valid cash refund payload', () => {
    const payload = {
      sale_id: 'SALE-000001',
      return_type: 'cash_refund',
      returned_item: {
        product_id: 'PROD-000003',
        quantity: 1,
        condition: 'damaged',
      },
      reason: 'Defective charger',
      refund_amount: 6500,
      payment_method: 'cash',
    };

    const parsed = ProcessReturnSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('rejects return with zero or negative return quantity', () => {
    const payload = {
      sale_id: 'SALE-000001',
      return_type: 'cash_refund',
      returned_item: {
        product_id: 'PROD-000003',
        quantity: 0,
      },
      reason: 'Customer returned',
    };

    const parsed = ProcessReturnSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('rejects return with missing reason', () => {
    const payload = {
      sale_id: 'SALE-000001',
      return_type: 'cash_refund',
      returned_item: {
        product_id: 'PROD-000003',
        quantity: 1,
      },
      reason: '',
    };

    const parsed = ProcessReturnSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid return_type', () => {
    const payload = {
      sale_id: 'SALE-000001',
      return_type: 'store_credit_voucher',
      returned_item: {
        product_id: 'PROD-000003',
        quantity: 1,
      },
      reason: 'Customer changed mind',
    };

    const parsed = ProcessReturnSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });
});

describe('Returns Formatting Utilities', () => {
  it('maps return types to correct badges and labels', () => {
    const sameBadge = returnTypeBadge('exchange_same');
    expect(sameBadge.label).toBe('Same Exchange');
    expect(sameBadge.className).toBe('badge-blue');

    const diffBadge = returnTypeBadge('exchange_diff');
    expect(diffBadge.label).toBe('Different Exchange');
    expect(diffBadge.className).toBe('badge-purple');

    const refundBadge = returnTypeBadge('cash_refund');
    expect(refundBadge.label).toBe('Cash Refund');
    expect(refundBadge.className).toBe('badge-amber');
  });

  it('supports partially_returned sale status badge', () => {
    expect(saleStatusBadge('partially_returned')).toBe('badge-blue');
    expect(saleStatusBadge('returned')).toBe('badge-amber');
  });
});
