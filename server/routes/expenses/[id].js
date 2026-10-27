// api/expenses/[id].js
import { findOne, updateRow, deleteRow } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'expenses.manage');
  const id = req.query.id;
  if (!id) return fail(res, 'Expense ID required', 400);

  const expense = await findOne('Expenses', 'expense_id', id);
  if (!expense) return fail(res, 'Expense not found', 404);

  if (req.method === 'GET') {
    return ok(res, { expense });
  }

  if (req.method === 'PUT') {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.expense_id;
    if (updates.amount !== undefined) updates.amount = Number(updates.amount) || 0;
    await updateRow('Expenses', 'expense_id', id, updates);
    await logActivity(user, 'update', 'expense', id, `Updated expense ${expense.title}`);
    return ok(res, { expense: { ...expense, ...updates } }, 'Expense updated');
  }

  if (req.method === 'DELETE') {
    await deleteRow('Expenses', 'expense_id', id);
    await logActivity(user, 'delete', 'expense', id, `Deleted expense ${expense.title}`);
    return ok(res, {}, 'Expense deleted');
  }

  return fail(res, 'Method not allowed', 405);
});
