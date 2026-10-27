// api/customers/[id].js
// GET /api/customers/:id — get customer details and purchase history
// PUT /api/customers/:id — update customer profile
// GET /api/customers/:id/sales — get customer invoices

import { readSheet, findOne, updateRow } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'customers.view');
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'Customer ID required', 400);

  const customer = await findOne('Customers', 'customer_id', id);
  if (!customer) return fail(res, 'Customer not found', 404);

  const sales = await readSheet('Sales');
  const customerSales = sales.filter((s) => s.customer_id === id);

  if (action === 'sales' && req.method === 'GET') {
    return ok(res, { sales: customerSales });
  }

  if (req.method === 'GET') {
    return ok(res, {
      customer: {
        ...customer,
        sales: customerSales.slice(-20).reverse(),
      },
    });
  }

  if (req.method === 'PUT') {
    requireAuth(req, 'customers.edit');
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.customer_id;
    await updateRow('Customers', 'customer_id', id, updates);
    return ok(res, { customer: { ...customer, ...updates } }, 'Customer updated');
  }

  if (req.method === 'DELETE') {
    requireAuth(req, 'customers.manage');
    if (customerSales.length > 0) {
      await updateRow('Customers', 'customer_id', id, { is_active: 'false', updated_at: new Date().toISOString() });
      return ok(res, {}, 'Customer has sales history; marked as inactive instead of deleting');
    }
    const { deleteRow } = await import('../lib/sheets.js');
    await deleteRow('Customers', 'customer_id', id);
    return ok(res, {}, 'Customer deleted');
  }

  return fail(res, 'Method not allowed', 405);
});
