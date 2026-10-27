// api/sales/index.js
// POST /api/sales — create a new sale (POS transaction)
// GET /api/sales — list sales

import {
  readSheet, appendRow, updateRow, batchAppend, findOne, generateId, findMany
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CreateSaleSchema } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);

  // ─────────────────────────────────────────────
  // GET — List Sales
  // ─────────────────────────────────────────────
  if (req.method === 'GET') {
    requireAuth(req, 'sales.view');
    const sales = await readSheet('Sales');
    const { q, customer_id, cashier_id, status, payment_status, from, to, limit = '50', offset = '0' } = req.query || {};

    let filtered = sales;

    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((s) =>
        s.invoice_number?.toLowerCase().includes(term) ||
        s.customer_name?.toLowerCase().includes(term)
      );
    }
    if (customer_id) filtered = filtered.filter((s) => s.customer_id === customer_id);
    if (cashier_id) filtered = filtered.filter((s) => s.cashier_id === cashier_id);
    if (status) filtered = filtered.filter((s) => s.sale_status === status);
    if (payment_status) filtered = filtered.filter((s) => s.payment_status === payment_status);
    if (from) filtered = filtered.filter((s) => s.sale_date >= from);
    if (to) filtered = filtered.filter((s) => s.sale_date <= to + 'T23:59:59');

    const total = filtered.length;
    const paginated = filtered
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(Number(offset), Number(offset) + Number(limit));

    return ok(res, { sales: paginated, total });
  }

  // ─────────────────────────────────────────────
  // POST — Create Sale
  // ─────────────────────────────────────────────
  if (req.method === 'POST') {
    requireAuth(req, 'sales.create');

    const data = validate(CreateSaleSchema, req.body);

    // ── Idempotency check ──────────────────────
    const payments = await readSheet('Payments');
    const duplicate = payments.find((p) => p.idempotency_key === data.idempotency_key);
    if (duplicate) {
      const existingSale = await findOne('Sales', 'sale_id', duplicate.related_id);
      return ok(res, { sale: existingSale }, 'Sale already recorded (idempotent)');
    }

    // ── Resolve customer ──────────────────────
    let customer = null;
    if (data.customer_id && data.customer_id !== 'WALK_IN') {
      customer = await findOne('Customers', 'customer_id', data.customer_id);
      if (!customer) return fail(res, 'Customer not found', 404);
    }
    const customerName = customer?.name || 'Walk-in Customer';

    // ── Load & validate products ──────────────
    const products = await readSheet('Products');
    const serials = await readSheet('Serials');

    let subtotal = 0;
    const enrichedItems = [];

    for (const item of data.items) {
      const product = products.find((p) => p.product_id === item.product_id);
      if (!product) return fail(res, `Product not found: ${item.product_id}`, 404);
      if (product.is_active === 'false') return fail(res, `Product is inactive: ${product.name}`, 400);

      let serialRecord = null;
      const currentQty = Number(product.stock_quantity) || 0;
      if (currentQty < item.quantity) {
        return fail(res, `Insufficient stock for: ${product.name} (available: ${currentQty})`, 409);
      }

      const itemDiscount = Number(item.discount) || 0;
      const lineTotal = (item.unit_price * item.quantity) - itemDiscount;
      subtotal += lineTotal;

      enrichedItems.push({
        product,
        serialRecord,
        ...item,
        lineTotal,
        itemDiscount,
      });
    }

    // ── Server-side total calculation ──────────
    // Never trust browser-calculated totals
    const discountAmount = Number(data.discount_amount) || 0;
    const taxAmount = Number(data.tax_amount) || 0;
    const grandTotal = subtotal - discountAmount + taxAmount;
    const amountPaid = Number(data.amount_paid) || 0;
    const outstandingBalance = Math.max(0, grandTotal - amountPaid);

    const paymentStatus =
      amountPaid >= grandTotal ? 'paid' :
      amountPaid > 0 ? 'partial' : 'unpaid';

    // ── Validate payment methods sum ──────────
    const paymentMethodsTotal = data.payment_methods.reduce((s, m) => s + Number(m.amount), 0);
    if (Math.abs(paymentMethodsTotal - amountPaid) > 1) {
      return fail(res, 'Payment methods total does not match amount paid', 400);
    }

    const now = new Date().toISOString();

    // ── Generate IDs ───────────────────────────
    const sale_id = await generateId('SALE', 'Sales', 'sale_id');
    const salesCount = (await readSheet('Sales')).length;
    const invoice_number = `INV-${String(salesCount + 1).padStart(6, '0')}`;

    // ── Save sale record ────────────────────────
    const saleRecord = {
      sale_id,
      invoice_number,
      customer_id: data.customer_id || 'WALK_IN',
      customer_name: customerName,
      cashier_id: user.user_id,
      cashier_name: user.name,
      sale_date: data.sale_date,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      amount_paid: amountPaid,
      outstanding_balance: outstandingBalance,
      payment_status: paymentStatus,
      sale_status: 'completed',
      notes: data.notes,
      created_at: now,
      updated_at: now,
    };

    await appendRow('Sales', saleRecord);

    // ── Save sale items ─────────────────────────
    const saleItems = enrichedItems.map((item, idx) => ({
      item_id: `${sale_id}-ITEM-${String(idx + 1).padStart(3, '0')}`,
      sale_id,
      product_id: item.product.product_id,
      product_name: item.product.name,
      model: item.product.model,
      brand: item.product.brand_name,
      serial_id: item.serialRecord?.serial_id || '',
      imei1: item.serialRecord?.imei1 || item.imei1 || '',
      imei2: item.serialRecord?.imei2 || '',
      serial_number: item.serialRecord?.serial_number || '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.itemDiscount,
      total_price: item.lineTotal,
      purchase_cost: item.product.purchase_cost,
      warranty_duration: item.product.warranty_duration,
      created_at: now,
    }));

    await batchAppend('Sale_Items', saleItems);

    // ── Update inventory ────────────────────────
    for (const item of enrichedItems) {
      const currentStock = Number(item.product.stock_quantity) || 0;
      const newQty = Math.max(0, currentStock - item.quantity);
      await updateRow('Products', 'product_id', item.product.product_id, {
        stock_quantity: newQty,
        updated_at: now,
      });

      // Record stock movement
      const movement_id = await generateId('MOV', 'Stock_Movements', 'movement_id');
      await appendRow('Stock_Movements', {
        movement_id,
        product_id: item.product.product_id,
        product_name: item.product.name,
        serial_id: '',
        movement_type: 'sale_out',
        quantity_change: -item.quantity,
        quantity_before: currentStock,
        quantity_after: newQty,
        related_id: sale_id,
        related_type: 'sale',
        reason: 'Point of sale',
        notes: `Invoice: ${invoice_number}`,
        recorded_by: user.user_id,
        created_at: now,
      });

      // Create warranty record if applicable
      if (item.product.warranty_duration && item.product.product_type === 'phone') {
        const warranty_id = await generateId('WAR', 'Warranties', 'warranty_id');
        const saleDate = new Date(data.sale_date);
        const durationMonths = parseInt(item.product.warranty_duration) || 0;
        const expiryDate = new Date(saleDate);
        expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

        await appendRow('Warranties', {
          warranty_id,
          product_id: item.product.product_id,
          product_name: item.product.name,
          serial_id: item.serialRecord?.serial_id || '',
          imei1: item.serialRecord?.imei1 || '',
          customer_id: data.customer_id || 'WALK_IN',
          customer_name: customerName,
          sale_id,
          invoice_number,
          sale_date: data.sale_date,
          warranty_start: data.sale_date,
          warranty_expiry: expiryDate.toISOString().split('T')[0],
          warranty_duration: item.product.warranty_duration,
          warranty_provider: '4N Planet',
          status: 'active',
          notes: '',
          created_at: now,
          updated_at: now,
        });
      }
    }

    // ── Save payments ───────────────────────────
    for (const pm of data.payment_methods) {
      if (Number(pm.amount) <= 0) continue;
      const payment_id = await generateId('PAY', 'Payments', 'payment_id');
      await appendRow('Payments', {
        payment_id,
        payment_type: 'customer_receipt',
        related_id: sale_id,
        party_id: data.customer_id || 'WALK_IN',
        party_name: customerName,
        party_type: 'customer',
        amount: pm.amount,
        payment_method: pm.method,
        reference_number: pm.reference || '',
        payment_date: data.sale_date,
        notes: '',
        recorded_by: user.user_id,
        idempotency_key: data.idempotency_key,
        created_at: now,
      });
    }

    // ── Update customer balance ─────────────────
    if (customer) {
      const newTotal = Number(customer.total_purchases) + grandTotal;
      const newPaid = Number(customer.total_payments) + amountPaid;
      const newBalance = Number(customer.outstanding_balance) + outstandingBalance;
      await updateRow('Customers', 'customer_id', customer.customer_id, {
        total_purchases: newTotal,
        total_payments: newPaid,
        outstanding_balance: newBalance,
        updated_at: now,
      });
    }

    await logActivity(user, 'create', 'sale', sale_id, `Sale ${invoice_number} — LKR ${grandTotal}`);

    return ok(res, {
      sale: saleRecord,
      invoice_number,
      items: saleItems,
    }, 'Sale completed successfully', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
