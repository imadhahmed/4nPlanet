// api/expenses/index.js
import { readSheet, appendRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, ExpenseSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'expenses.view');

  if (req.method === 'GET') {
    const expenses = await readSheet('Expenses');
    const { q, category, from, to } = req.query || {};
    let filtered = expenses;
    if (q) filtered = filtered.filter((e) => e.title?.toLowerCase().includes(q.toLowerCase()));
    if (category) filtered = filtered.filter((e) => e.category === category);
    if (from) filtered = filtered.filter((e) => e.expense_date >= from);
    if (to) filtered = filtered.filter((e) => e.expense_date <= to);
    const total_amount = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
    return ok(res, { expenses: filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)), total: filtered.length, total_amount });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'expenses.create');
    const data = validate(ExpenseSchema, req.body);
    const expense_id = await generateId('EXP', 'Expenses', 'expense_id');
    const now = new Date().toISOString();
    const expense = {
      expense_id, ...data,
      recorded_by: user.user_id,
      created_at: now,
      updated_at: now,
    };
    await appendRow('Expenses', expense);
    return ok(res, { expense }, 'Expense recorded', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
