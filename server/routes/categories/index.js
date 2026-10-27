// api/categories/index.js
import { readSheet, appendRow, updateRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CategorySchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {

  if (req.method === 'GET') {
    const categories = await readSheet('Categories');
    const subcategories = await readSheet('Subcategories');
    const { active_only } = req.query || {};
    let cats = active_only === 'true' ? categories.filter((c) => c.is_active !== 'false') : categories;
    const catsWithSubs = cats.map((c) => ({
      ...c,
      subcategories: subcategories.filter((s) => s.category_id === c.category_id && s.is_active !== 'false'),
    }));
    return ok(res, { categories: catsWithSubs });
  }

  if (req.method === 'POST') {
    const { user } = requireAuth(req, 'categories.manage');
    const data = validate(CategorySchema, req.body);
    const category_id = await generateId('CAT', 'Categories', 'category_id');
    const now = new Date().toISOString();
    const category = { category_id, ...data, created_at: now, updated_at: now };
    await appendRow('Categories', category);
    return ok(res, { category }, 'Category created', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
