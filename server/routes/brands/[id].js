// api/brands/[id].js
import { findOne, updateRow, deleteRow, readSheet } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'brands.manage');
  const id = req.query.id;
  if (!id) return fail(res, 'Brand ID required', 400);

  const brand = await findOne('Brands', 'brand_id', id);
  if (!brand) return fail(res, 'Brand not found', 404);

  if (req.method === 'GET') {
    return ok(res, { brand });
  }

  if (req.method === 'PUT') {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.brand_id;
    await updateRow('Brands', 'brand_id', id, updates);
    await logActivity(user, 'update', 'brand', id, `Updated brand ${brand.name}`);
    return ok(res, { brand: { ...brand, ...updates } }, 'Brand updated');
  }

  if (req.method === 'DELETE') {
    const products = await readSheet('Products');
    const hasProducts = products.some((p) => p.brand_id === id);
    if (hasProducts) {
      await updateRow('Brands', 'brand_id', id, { is_active: 'false', updated_at: new Date().toISOString() });
      return ok(res, {}, 'Brand has associated products; deactivated instead of deleting');
    }
    await deleteRow('Brands', 'brand_id', id);
    await logActivity(user, 'delete', 'brand', id, `Deleted brand ${brand.name}`);
    return ok(res, {}, 'Brand deleted');
  }

  return fail(res, 'Method not allowed', 405);
});
