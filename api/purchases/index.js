// api/purchases/index.js
// POST /api/purchases — create purchase
// GET /api/purchases — list purchases

import {
  readSheet, appendRow, updateRow, batchAppend, findOne, generateId
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CreatePurchaseSchema } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);

  if (req.method === 'GET') {
    requireAuth(req, 'purchases.view');
    const purchases = await readSheet('Purchases');
    const { q, supplier_id, status, from, to } = req.query || {};
    let filtered = purchases;
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((p) =>
        p.purchase_number?.toLowerCase().includes(term) ||
        p.supplier_name?.toLowerCase().includes(term)
      );
    }
    if (supplier_id) filtered = filtered.filter((p) => p.supplier_id === supplier_id);
    if (status) filtered = filtered.filter((p) => p.status === status);
    if (from) filtered = filtered.filter((p) => p.purchase_date >= from);
    if (to) filtered = filtered.filter((p) => p.purchase_date <= to);
    return ok(res, { purchases: filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)), total: filtered.length });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'purchases.create');
    const data = validate(CreatePurchaseSchema, req.body);

    const supplier = await findOne('Suppliers', 'supplier_id', data.supplier_id);
    if (!supplier) return fail(res, 'Supplier not found', 404);

    const products = await readSheet('Products');
    let subtotal = 0;

    for (const item of data.items) {
      const product = products.find((p) => p.product_id === item.product_id);
      if (!product) return fail(res, `Product not found: ${item.product_id}`, 404);

      subtotal += item.unit_cost * item.quantity - (item.discount || 0);
    }

    const totalCost = subtotal - (data.discount || 0) + (data.additional_costs || 0);
    const amountPaid = Number(data.amount_paid) || 0;
    const outstandingBalance = Math.max(0, totalCost - amountPaid);

    const now = new Date().toISOString();
    const purchase_id = await generateId('PUR', 'Purchases', 'purchase_id');
    const purchasesCount = (await readSheet('Purchases')).length;
    const purchase_number = `PO-${String(purchasesCount + 1).padStart(6, '0')}`;

    const purchaseRecord = {
      purchase_id,
      purchase_number,
      supplier_id: data.supplier_id,
      supplier_name: supplier.name,
      purchase_date: data.purchase_date,
      subtotal,
      discount: data.discount || 0,
      additional_costs: data.additional_costs || 0,
      total_cost: totalCost,
      amount_paid: amountPaid,
      outstanding_balance: outstandingBalance,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      notes: data.notes,
      status: 'confirmed',
      created_by: user.user_id,
      created_at: now,
      updated_at: now,
    };

    await appendRow('Purchases', purchaseRecord);

    // Save items and update inventory
    const purchaseItems = [];
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const product = products.find((p) => p.product_id === item.product_id);
      const itemTotal = item.unit_cost * item.quantity - (item.discount || 0);

      let serial_id = '';

      // Update stock quantity directly
      const currentQty = Number(product.stock_quantity) || 0;
      const newQty = currentQty + item.quantity;
      await updateRow('Products', 'product_id', item.product_id, {
        stock_quantity: newQty,
        updated_at: now,
      });

      // Stock movement
      const movement_id = await generateId('MOV', 'Stock_Movements', 'movement_id');
      await appendRow('Stock_Movements', {
        movement_id,
        product_id: item.product_id,
        product_name: product.name,
        serial_id,
        movement_type: 'purchase_in',
        quantity_change: item.quantity,
        quantity_before: product.is_serialized === 'true' ? 0 : Number(product.stock_quantity),
        quantity_after: product.is_serialized === 'true' ? item.quantity : Number(product.stock_quantity) + item.quantity,
        related_id: purchase_id,
        related_type: 'purchase',
        reason: 'Stock purchase',
        notes: item.serial_number || '',
        recorded_by: user.user_id,
        created_at: now,
      });

      purchaseItems.push({
        item_id: `${purchase_id}-ITEM-${String(i + 1).padStart(3, '0')}`,
        purchase_id,
        product_id: item.product_id,
        product_name: product.name,
        serial_id,
        imei1: item.imei1 || '',
        imei2: item.imei2 || '',
        serial_number: item.serial_number || '',
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        discount: item.discount || 0,
        total_cost: itemTotal,
        created_at: now,
      });
    }

    await batchAppend('Purchase_Items', purchaseItems);

    // Payment record
    if (amountPaid > 0) {
      const payment_id = await generateId('PAY', 'Payments', 'payment_id');
      await appendRow('Payments', {
        payment_id,
        payment_type: 'supplier_payment',
        related_id: purchase_id,
        party_id: data.supplier_id,
        party_name: supplier.name,
        party_type: 'supplier',
        amount: amountPaid,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        payment_date: data.purchase_date,
        notes: data.notes,
        recorded_by: user.user_id,
        idempotency_key: `${purchase_id}-initial`,
        created_at: now,
      });
    }

    // Update supplier balance
    const currentSupplierBalance = Number(supplier.outstanding_balance) || 0;
    await updateRow('Suppliers', 'supplier_id', data.supplier_id, {
      outstanding_balance: currentSupplierBalance + outstandingBalance,
      updated_at: now,
    });

    await logActivity(user, 'create', 'purchase', purchase_id, `Purchase ${purchase_number} — LKR ${totalCost}`);

    return ok(res, { purchase: purchaseRecord, items: purchaseItems }, 'Purchase recorded', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
