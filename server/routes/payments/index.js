// api/payments/index.js
import { readSheet, appendRow, updateRow, findOne, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CreatePaymentSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'payments.view');

  if (req.method === 'GET') {
    const payments = await readSheet('Payments');
    const { q, type, party_id, method, from, to } = req.query || {};
    let filtered = payments;
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((p) =>
        p.party_name?.toLowerCase().includes(term) ||
        p.reference_number?.toLowerCase().includes(term)
      );
    }
    if (type) filtered = filtered.filter((p) => p.payment_type === type);
    if (party_id) filtered = filtered.filter((p) => p.party_id === party_id);
    if (method) filtered = filtered.filter((p) => p.payment_method === method);
    if (from) filtered = filtered.filter((p) => p.payment_date >= from);
    if (to) filtered = filtered.filter((p) => p.payment_date <= to);
    return ok(res, { payments: filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)), total: filtered.length });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'payments.create');
    const data = validate(CreatePaymentSchema, req.body);

    // Idempotency check
    const existing = (await readSheet('Payments')).find((p) => p.idempotency_key === data.idempotency_key);
    if (existing) return ok(res, { payment: existing }, 'Payment already recorded (idempotent)');

    const payment_id = await generateId('PAY', 'Payments', 'payment_id');
    const now = new Date().toISOString();

    const payment = {
      payment_id,
      payment_type: data.payment_type,
      related_id: data.related_id,
      party_id: data.party_id,
      party_name: '',
      party_type: data.payment_type === 'customer_receipt' ? 'customer' : 'supplier',
      amount: data.amount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      payment_date: data.payment_date,
      notes: data.notes,
      recorded_by: user.user_id,
      idempotency_key: data.idempotency_key,
      created_at: now,
    };

    // Update related record outstanding balance
    if (data.payment_type === 'customer_receipt') {
      const sale = await findOne('Sales', 'sale_id', data.related_id);
      if (sale) {
        const newOutstanding = Math.max(0, Number(sale.outstanding_balance) - data.amount);
        const newAmountPaid = Number(sale.amount_paid) + data.amount;
        const paymentStatus = newOutstanding <= 0 ? 'paid' : 'partial';
        await updateRow('Sales', 'sale_id', data.related_id, {
          outstanding_balance: newOutstanding,
          amount_paid: newAmountPaid,
          payment_status: paymentStatus,
          updated_at: now,
        });
        payment.party_name = sale.customer_name;
      }
      // Also update customer balance
      if (data.party_id !== 'WALK_IN') {
        const customer = await findOne('Customers', 'customer_id', data.party_id);
        if (customer) {
          await updateRow('Customers', 'customer_id', data.party_id, {
            total_payments: Number(customer.total_payments) + data.amount,
            outstanding_balance: Math.max(0, Number(customer.outstanding_balance) - data.amount),
            updated_at: now,
          });
        }
      }
    } else if (data.payment_type === 'supplier_payment') {
      const purchase = await findOne('Purchases', 'purchase_id', data.related_id);
      if (purchase) {
        const newOutstanding = Math.max(0, Number(purchase.outstanding_balance) - data.amount);
        await updateRow('Purchases', 'purchase_id', data.related_id, {
          outstanding_balance: newOutstanding,
          amount_paid: Number(purchase.amount_paid) + data.amount,
          updated_at: now,
        });
        payment.party_name = purchase.supplier_name;
      }
      const supplier = await findOne('Suppliers', 'supplier_id', data.party_id);
      if (supplier) {
        await updateRow('Suppliers', 'supplier_id', data.party_id, {
          outstanding_balance: Math.max(0, Number(supplier.outstanding_balance) - data.amount),
          updated_at: now,
        });
      }
    }

    await appendRow('Payments', payment);
    return ok(res, { payment }, 'Payment recorded', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
