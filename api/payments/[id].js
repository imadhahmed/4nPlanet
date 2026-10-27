// api/payments/[id].js
// GET /api/payments/:id — get payment details
// DELETE /api/payments/:id — delete payment record

import { readSheet, findOne, updateRow, deleteRow } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'payments.view');
  const id = req.query.id;

  if (!id) return fail(res, 'Payment ID required', 400);

  const payment = await findOne('Payments', 'payment_id', id);
  if (!payment) return fail(res, 'Payment not found', 404);

  if (req.method === 'GET') {
    return ok(res, { payment });
  }

  if (req.method === 'DELETE') {
    requireAuth(req, 'payments.create');
    try {
      await deleteRow('Payments', 'payment_id', id);
    } catch {
      // If hard delete not supported, update status
      await updateRow('Payments', 'payment_id', id, {
        status: 'cancelled',
        notes: `${payment.notes || ''} [Cancelled/Deleted]`,
        updated_at: new Date().toISOString(),
      });
    }

    await logActivity(user, 'delete', 'payment', id, `Deleted payment ${payment.payment_id} (${payment.amount})`);
    return ok(res, null, 'Payment deleted successfully');
  }

  return fail(res, 'Method not allowed', 405);
});
