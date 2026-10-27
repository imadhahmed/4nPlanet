// api/brands/index.js
import { readSheet, appendRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, BrandSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  if (req.method === 'GET') {
    const brands = await readSheet('Brands');
    const { active_only } = req.query || {};
    const filtered = active_only === 'true' ? brands.filter((b) => b.is_active !== 'false') : brands;
    return ok(res, { brands: filtered });
  }

  if (req.method === 'POST') {
    const { user } = requireAuth(req, 'brands.manage');
    const data = validate(BrandSchema, req.body);
    const brand_id = await generateId('BRD', 'Brands', 'brand_id');
    const now = new Date().toISOString();
    const brand = { brand_id, ...data, created_at: now, updated_at: now };
    await appendRow('Brands', brand);
    return ok(res, { brand }, 'Brand created', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
