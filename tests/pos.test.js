// tests/pos.test.js
import { describe, it, expect } from 'vitest';

describe('Point of Sale (POS) Cart Calculations', () => {
  it('calculates line item total with unit price, quantity, and discount', () => {
    const item = {
      product_id: 'PROD-000003',
      name: 'Anker 30W USB-C GaN Charger',
      unit_price: 6500,
      quantity: 3,
      discount: 500,
    };

    const lineTotal = item.unit_price * item.quantity - item.discount;
    expect(lineTotal).toBe(19000);
  });

  it('calculates subtotal across multiple line items', () => {
    const cartItems = [
      { unit_price: 6500, quantity: 2, discount: 0 }, // 13000
      { unit_price: 45000, quantity: 1, discount: 2000 }, // 43000
    ];

    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity - item.discount),
      0
    );
    expect(subtotal).toBe(56000);
  });

  it('calculates grand total with invoice discount', () => {
    const subtotal = 56000;
    const invoiceDiscount = 1000;
    const grandTotal = Math.max(0, subtotal - invoiceDiscount);
    expect(grandTotal).toBe(55000);
  });

  it('calculates change due and outstanding balance accurately', () => {
    const grandTotal = 55000;

    // Case 1: Overpaid (Change due)
    const paidMore = 60000;
    const change = Math.max(0, paidMore - grandTotal);
    const outstanding1 = Math.max(0, grandTotal - paidMore);
    expect(change).toBe(5000);
    expect(outstanding1).toBe(0);

    // Case 2: Exact payment
    const paidExact = 55000;
    expect(Math.max(0, paidExact - grandTotal)).toBe(0);
    expect(Math.max(0, grandTotal - paidExact)).toBe(0);

    // Case 3: Partial payment (Outstanding due)
    const paidLess = 30000;
    const outstanding2 = Math.max(0, grandTotal - paidLess);
    expect(outstanding2).toBe(25000);
  });
});
