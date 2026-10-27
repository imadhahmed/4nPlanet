// api/purchases/[id].js
// GET /api/purchases/:id — get purchase order / GRN details
// GET /api/purchases/:id/items — get line items
// POST /api/purchases/:id/payments — pay towards outstanding purchase balance

import {
  readSheet, findOne, updateRow, appendRow, generateId
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'Purchase ID required', 400);

  const purchase = await findOne('Purchases', 'purchase_id', id);
  if (!purchase) return fail(res, 'Purchase not found', 404);

  const items = await readSheet('Purchase_Items');
  const purchaseItems = items.filter((i) => i.purchase_id === id);

  if (action === 'items' && req.method === 'GET') {
    return ok(res, { items: purchaseItems });
  }

  if (action === 'payments' && req.method === 'POST') {
    requireAuth(req, 'purchases.create');
    const { amount, payment_method, reference_note } = req.body;
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) return fail(res, 'Valid payment amount required', 400);

    const outstanding = Number(purchase.outstanding_balance) || 0;
    const newPaid = (Number(purchase.amount_paid) || 0) + payAmt;
    const newOutstanding = Math.max(0, outstanding - payAmt);
    const newStatus = newOutstanding === 0 ? 'paid' : 'partial';

    await updateRow('Purchases', 'purchase_id', id, {
      amount_paid: newPaid,
      outstanding_balance: newOutstanding,
      payment_status: newStatus,
      updated_at: new Date().toISOString(),
    });

    const payment_id = await generateId('PAY', 'Payments', 'payment_id');
    await appendRow('Payments', {
      payment_id,
      payment_type: 'purchase_payment',
      related_id: id,
      amount: payAmt,
      payment_method: payment_method || 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_note: reference_note || '',
      created_by: user.user_id,
      created_at: new Date().toISOString(),
    });

    await logActivity(user, 'payment', 'purchase', id, `Recorded payment of Rs. ${payAmt} for purchase ${purchase.purchase_number}`);

    return ok(res, { amount_paid: newPaid, outstanding_balance: newOutstanding }, 'Payment recorded');
  }

  if (req.method === 'GET') {
    const payments = await readSheet('Payments');
    const purchasePayments = payments.filter((p) => p.related_id === id);

    return ok(res, {
      purchase: {
        ...purchase,
        items: purchaseItems,
        payments: purchasePayments,
      },
    });
  }

  // DELETE /api/purchases/:id — cancel/delete purchase
  if (req.method === 'DELETE') {
    requireAuth(req, 'purchases.create');
    const now = new Date().toISOString();

    await updateRow('Purchases', 'purchase_id', id, {
      status: 'cancelled',
      updated_at: now,
    });

    await logActivity(user, 'cancel', 'purchase', id, `Cancelled purchase ${purchase.purchase_number}`);
    return ok(res, null, 'Purchase cancelled/deleted successfully');
  }

  return fail(res, 'Method not allowed', 405);
});
