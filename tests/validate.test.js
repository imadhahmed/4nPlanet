// tests/validate.test.js
import { describe, it, expect } from 'vitest';
import {
  CreateProductSchema,
  CreatePurchaseSchema,
  CreateSaleSchema,
  CustomerSchema,
  SupplierSchema,
  ExpenseSchema
} from '../api/lib/validate.js';

describe('Validation Schemas', () => {
  it('validates a valid Product payload', () => {
    const product = {
      name: 'iPhone 15 Pro 128GB',
      brand_id: 'BRD-000001',
      category_id: 'CAT-000001',
      purchase_cost: 290000,
      retail_price: 335000,
      is_serialized: true,
      stock_quantity: 0,
      min_stock_level: 2,
    };
    const parsed = CreateProductSchema.safeParse(product);
    expect(parsed.success).toBe(true);
  });

  it('rejects product with negative pricing', () => {
    const product = {
      name: 'Test Product',
      brand_id: 'BRD-1',
      category_id: 'CAT-1',
      purchase_cost: -500,
      retail_price: 1000,
    };
    const parsed = CreateProductSchema.safeParse(product);
    expect(parsed.success).toBe(false);
  });

  it('validates purchase order line items', () => {
    const purchase = {
      supplier_id: 'SUP-000001',
      purchase_date: '2026-10-27',
      items: [
        {
          product_id: 'PROD-000001',
          quantity: 5,
          unit_cost: 290000,
          discount: 5000,
        },
      ],
      amount_paid: 1000000,
      payment_method: 'bank_transfer',
    };
    const parsed = CreatePurchaseSchema.safeParse(purchase);
    expect(parsed.success).toBe(true);
  });

  it('rejects purchase order with empty items', () => {
    const purchase = {
      supplier_id: 'SUP-000001',
      purchase_date: '2026-10-27',
      items: [],
    };
    const parsed = CreatePurchaseSchema.safeParse(purchase);
    expect(parsed.success).toBe(false);
  });

  it('validates customer payload', () => {
    const customer = {
      name: 'Nimal Silva',
      phone: '0771234567',
      customer_type: 'registered',
    };
    const parsed = CustomerSchema.safeParse(customer);
    expect(parsed.success).toBe(true);
  });

  it('validates a sale payload containing manual / custom product items', () => {
    const sale = {
      customer_id: 'WALK_IN',
      sale_date: '2026-10-29T10:00:00Z',
      items: [
        {
          product_id: 'CUSTOM-1730000000',
          product_name: 'Custom Phone Case + UV Print',
          model: 'iPhone 15 Case',
          brand: 'Custom',
          is_custom: true,
          quantity: 1,
          unit_price: 3500,
          discount: 500,
        },
      ],
      amount_paid: 3000,
      payment_methods: [
        {
          method: 'cash',
          amount: 3000,
        },
      ],
      idempotency_key: 'test-custom-sale-1',
    };
    const parsed = CreateSaleSchema.safeParse(sale);
    expect(parsed.success).toBe(true);
  });

  it('validates expense payload', () => {
    const expense = {
      title: 'Shop Electricity Oct 2026',
      category: 'Electricity & Utilities',
      amount: 14500,
      expense_date: '2026-10-27',
      payment_method: 'cash',
    };
    const parsed = ExpenseSchema.safeParse(expense);
    expect(parsed.success).toBe(true);
  });
});
