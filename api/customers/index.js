// api/customers/index.js
import { readSheet, appendRow, updateRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CustomerSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  requireAuth(req, 'customers.view');

  if (req.method === 'GET') {
    const customers = await readSheet('Customers');
    const { q, type } = req.query || {};
    let filtered = customers.filter((c) => c.is_active !== 'false');
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term)
      );
    }
    if (type) filtered = filtered.filter((c) => c.customer_type === type);
    return ok(res, { customers: filtered, total: filtered.length });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'customers.create');
    const { user } = requireAuth(req);
    const data = validate(CustomerSchema, req.body);
    const customer_id = await generateId('CUST', 'Customers', 'customer_id');
    const now = new Date().toISOString();
    const customer = {
      customer_id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      customer_type: data.customer_type,
      notes: data.notes,
      total_purchases: 0,
      total_payments: 0,
      outstanding_balance: 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    await appendRow('Customers', customer);
    return ok(res, { customer }, 'Customer created', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
