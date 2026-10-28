// tests/returns-api.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import returnsHandler from '../api/returns/index.js';
import returnDetailHandler from '../api/returns/[id].js';
import { createSessionToken } from '../api/lib/auth.js';
import { readSheet, appendRow, updateRow } from '../api/lib/sheets.js';
import { readLocalSheet, writeLocalSheet } from '../api/lib/localData.js';

function createMockReqRes({ method = 'GET', query = {}, body = {}, role = 'cashier' } = {}) {
  const token = createSessionToken({
    user_id: 'USR-000002',
    name: 'Cashier Staff',
    email: 'cashier@4nplanet.lk',
    role,
  });

  const req = {
    method,
    query,
    body,
    headers: {
      cookie: `4np_session=${token}`,
    },
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get data() {
      return responseData;
    },
  };

  return { req, res };
}

describe('Returns & Exchanges API Integration', () => {
  const testSaleId = 'SALE-TEST-001';
  const testInvoice = 'INV-TEST-001';
  const now = new Date().toISOString();

  beforeEach(async () => {
    // Ensure clean test sale exists
    const sales = readLocalSheet('Sales').filter((s) => s.sale_id !== testSaleId);
    sales.push({
      sale_id: testSaleId,
      invoice_number: testInvoice,
      customer_id: 'WALK_IN',
      customer_name: 'Walk-in Customer',
      cashier_id: 'USR-000002',
      cashier_name: 'Cashier Staff',
      sale_date: '2026-10-28',
      subtotal: 13000,
      discount_amount: 0,
      tax_amount: 0,
      grand_total: 13000,
      amount_paid: 13000,
      outstanding_balance: 0,
      payment_status: 'paid',
      sale_status: 'completed',
      notes: 'Test sale',
      created_at: now,
      updated_at: now,
    });
    writeLocalSheet('Sales', sales);

    // Clean sale items
    const saleItems = readLocalSheet('Sale_Items').filter((i) => i.sale_id !== testSaleId);
    saleItems.push({
      item_id: 'ITEM-TEST-001',
      sale_id: testSaleId,
      product_id: 'PROD-000003', // Anker charger
      product_name: 'Anker 30W USB-C GaN Charger',
      quantity: 2,
      unit_price: 6500,
      discount: 0,
      total_price: 13000,
      created_at: now,
    });
    writeLocalSheet('Sale_Items', saleItems);

    // Clear test returns
    const returns = readLocalSheet('Returns').filter((r) => r.original_sale_id !== testSaleId);
    writeLocalSheet('Returns', returns);

    // Reset product stock
    const products = readLocalSheet('Products');
    const anker = products.find((p) => p.product_id === 'PROD-000003');
    if (anker) {
      anker.stock_quantity = 25;
      writeLocalSheet('Products', products);
    }
  });

  it('looks up an invoice and validates returnable quantities', async () => {
    const { req, res } = createMockReqRes({
      method: 'GET',
      query: { action: 'lookup', invoice: testInvoice },
    });

    await returnsHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.data.results.length).toBeGreaterThan(0);

    const match = res.data.data.results[0];
    expect(match.sale.invoice_number).toBe(testInvoice);
    expect(match.items[0].eligible_quantity).toBe(2);
    expect(match.can_return).toBe(true);
  });

  it('processes a Cash Refund and correctly increments inventory', async () => {
    const initialProducts = readLocalSheet('Products');
    const initialAnkerStock = Number(initialProducts.find((p) => p.product_id === 'PROD-000003')?.stock_quantity || 0);

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        sale_id: testSaleId,
        return_type: 'cash_refund',
        returned_item: {
          item_id: 'ITEM-TEST-001',
          product_id: 'PROD-000003',
          product_name: 'Anker 30W USB-C GaN Charger',
          quantity: 1,
          condition: 'restock',
        },
        reason: 'Customer returned 1 charger',
        refund_amount: 6500,
        payment_method: 'cash',
      },
    });

    await returnsHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data.return.return_number).toMatch(/^RET-\d+/);
    expect(res.data.data.return.refund_amount).toBe(6500);

    // Check inventory stock incremented by 1
    const updatedProducts = readLocalSheet('Products');
    const updatedAnkerStock = Number(updatedProducts.find((p) => p.product_id === 'PROD-000003')?.stock_quantity || 0);
    expect(updatedAnkerStock).toBe(initialAnkerStock + 1);

    // Check Stock_Movements record created
    const movements = readLocalSheet('Stock_Movements');
    const returnMov = movements.find((m) => m.related_id === res.data.data.return_id);
    expect(returnMov).toBeDefined();
    expect(returnMov.movement_type).toBe('return_in');
  });

  it('prevents duplicate returns when quantity exceeds remaining eligible', async () => {
    // First return: 1 unit
    const firstCall = createMockReqRes({
      method: 'POST',
      body: {
        sale_id: testSaleId,
        return_type: 'cash_refund',
        returned_item: {
          item_id: 'ITEM-TEST-001',
          product_id: 'PROD-000003',
          quantity: 1,
          condition: 'restock',
        },
        reason: 'Returned first unit',
        refund_amount: 6500,
      },
    });
    await returnsHandler(firstCall.req, firstCall.res);
    expect(firstCall.res.statusCode).toBe(201);

    // Second return: trying to return 2 units (when only 1 unit remains eligible)
    const secondCall = createMockReqRes({
      method: 'POST',
      body: {
        sale_id: testSaleId,
        return_type: 'cash_refund',
        returned_item: {
          item_id: 'ITEM-TEST-001',
          product_id: 'PROD-000003',
          quantity: 2,
          condition: 'restock',
        },
        reason: 'Attempting to return more than purchased',
        refund_amount: 13000,
      },
    });
    await returnsHandler(secondCall.req, secondCall.res);

    expect(secondCall.res.statusCode).toBe(400);
    expect(secondCall.res.data.success).toBe(false);
    expect(secondCall.res.data.message).toContain('Only 1 units remain eligible');
  });

  it('processes Exchange for Another Product and updates both inventories and price difference', async () => {
    // PROD-000003 is Anker charger (price 6500)
    // PROD-000004 is Display screen (price 45000)
    const initialProducts = readLocalSheet('Products');
    const initialChargerStock = Number(initialProducts.find((p) => p.product_id === 'PROD-000003')?.stock_quantity || 0);
    const initialScreenStock = Number(initialProducts.find((p) => p.product_id === 'PROD-000004')?.stock_quantity || 0);

    const { req, res } = createMockReqRes({
      method: 'POST',
      body: {
        sale_id: testSaleId,
        return_type: 'exchange_diff',
        returned_item: {
          item_id: 'ITEM-TEST-001',
          product_id: 'PROD-000003',
          quantity: 1,
          condition: 'restock',
        },
        exchange_item: {
          product_id: 'PROD-000004',
          quantity: 1,
        },
        reason: 'Upgrade to OLED Display component',
        payment_method: 'card',
        reference_number: 'CARD-AUTH-1234',
      },
    });

    await returnsHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.data.success).toBe(true);

    const ret = res.data.data.return;
    // Difference = 45000 - 6500 = 38500
    expect(ret.difference_amount).toBe(38500);
    expect(ret.exchange_product_id).toBe('PROD-000004');

    // Returned product stock increased by 1
    const updatedProducts = readLocalSheet('Products');
    const newChargerStock = Number(updatedProducts.find((p) => p.product_id === 'PROD-000003')?.stock_quantity || 0);
    expect(newChargerStock).toBe(initialChargerStock + 1);

    // Exchange product stock decreased by 1
    const newScreenStock = Number(updatedProducts.find((p) => p.product_id === 'PROD-000004')?.stock_quantity || 0);
    expect(newScreenStock).toBe(initialScreenStock - 1);

    // Payments record should be added for the additional collection
    const payments = readLocalSheet('Payments');
    const diffPayment = payments.find((p) => p.related_id === ret.return_id);
    expect(diffPayment).toBeDefined();
    expect(diffPayment.amount).toBe(38500);
    expect(diffPayment.payment_method).toBe('card');
  });

  it('retrieves full return receipt details by return_id', async () => {
    // First create a return
    const createCall = createMockReqRes({
      method: 'POST',
      body: {
        sale_id: testSaleId,
        return_type: 'exchange_same',
        returned_item: {
          item_id: 'ITEM-TEST-001',
          product_id: 'PROD-000003',
          quantity: 1,
          condition: 'restock',
        },
        reason: 'Same unit replacement for faulty cable pin',
      },
    });
    await returnsHandler(createCall.req, createCall.res);
    const returnId = createCall.res.data.data.return_id;

    // Fetch via [id] handler
    const detailCall = createMockReqRes({
      method: 'GET',
      query: { id: returnId },
    });
    await returnDetailHandler(detailCall.req, detailCall.res);

    expect(detailCall.res.statusCode).toBe(200);
    expect(detailCall.res.data.data.return.return_id).toBe(returnId);
    expect(detailCall.res.data.data.return.original_sale.invoice_number).toBe(testInvoice);
    expect(detailCall.res.data.data.return.details.returned_item.product_id).toBe('PROD-000003');
  });
});