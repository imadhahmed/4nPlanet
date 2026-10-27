// api/suppliers/[id].js
// GET /api/suppliers/:id — get supplier details and purchases
// PUT /api/suppliers/:id — update supplier info

import { readSheet, findOne, updateRow } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'suppliers.view');
  const id = req.query.id;

  if (!id) return fail(res, 'Supplier ID required', 400);

  const supplier = await findOne('Suppliers', 'supplier_id', id);
  if (!supplier) return fail(res, 'Supplier not found', 404);

  const purchases = await readSheet('Purchases');
  const supplierPurchases = purchases.filter((p) => p.supplier_id === id);

  if (req.method === 'GET') {
    return ok(res, {
      supplier: {
        ...supplier,
        purchases: supplierPurchases.slice(-20).reverse(),
      },
    });
  }

  if (req.method === 'PUT') {
    requireAuth(req, 'suppliers.manage');
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.supplier_id;
    await updateRow('Suppliers', 'supplier_id', id, updates);
    return ok(res, { supplier: { ...supplier, ...updates } }, 'Supplier updated');
  }

  if (req.method === 'DELETE') {
    requireAuth(req, 'suppliers.manage');
    if (supplierPurchases.length > 0) {
      await updateRow('Suppliers', 'supplier_id', id, { is_active: 'false', updated_at: new Date().toISOString() });
      return ok(res, {}, 'Supplier has purchase records; marked as inactive instead of deleting');
    }
    const { deleteRow } = await import('../lib/sheets.js');
    await deleteRow('Suppliers', 'supplier_id', id);
    return ok(res, {}, 'Supplier deleted');
  }

  return fail(res, 'Method not allowed', 405);
});
