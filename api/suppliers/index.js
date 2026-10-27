// api/suppliers/index.js
import { readSheet, appendRow, updateRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, SupplierSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  requireAuth(req, 'suppliers.view');

  if (req.method === 'GET') {
    const suppliers = await readSheet('Suppliers');
    const { q } = req.query || {};
    let filtered = suppliers.filter((s) => s.is_active !== 'false');
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((s) =>
        s.name?.toLowerCase().includes(term) ||
        s.phone?.toLowerCase().includes(term)
      );
    }
    return ok(res, { suppliers: filtered, total: filtered.length });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'suppliers.manage');
    const { user } = requireAuth(req);
    const data = validate(SupplierSchema, req.body);
    const supplier_id = await generateId('SUP', 'Suppliers', 'supplier_id');
    const now = new Date().toISOString();
    const supplier = {
      supplier_id, ...data,
      outstanding_balance: 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    await appendRow('Suppliers', supplier);
    return ok(res, { supplier }, 'Supplier created', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
