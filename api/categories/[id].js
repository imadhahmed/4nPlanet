// api/categories/[id].js
import { findOne, updateRow, deleteRow, readSheet } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'categories.manage');
  const id = req.query.id;
  if (!id) return fail(res, 'Category ID required', 400);

  const category = await findOne('Categories', 'category_id', id);
  if (!category) return fail(res, 'Category not found', 404);

  if (req.method === 'GET') {
    return ok(res, { category });
  }

  if (req.method === 'PUT') {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.category_id;
    await updateRow('Categories', 'category_id', id, updates);
    await logActivity(user, 'update', 'category', id, `Updated category ${category.name}`);
    return ok(res, { category: { ...category, ...updates } }, 'Category updated');
  }

  if (req.method === 'DELETE') {
    // Check if products exist in category
    const products = await readSheet('Products');
    const hasProducts = products.some((p) => p.category_id === id);
    if (hasProducts) {
      await updateRow('Categories', 'category_id', id, { is_active: 'false', updated_at: new Date().toISOString() });
      return ok(res, {}, 'Category has associated products; deactivated instead of deleting');
    }
    await deleteRow('Categories', 'category_id', id);
    await logActivity(user, 'delete', 'category', id, `Deleted category ${category.name}`);
    return ok(res, {}, 'Category deleted');
  }

  return fail(res, 'Method not allowed', 405);
});
