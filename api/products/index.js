// api/products/index.js
// GET /api/products — list all products
// POST /api/products — create new product

import {
  readSheet, appendRow, generateId, findOne
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CreateProductSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);

  if (req.method === 'GET') {
    // ── List products ──────────────────────────────────
    const products = await readSheet('Products');
    const productMap = products.map((p) => ({
      ...p,
      stock_quantity: Number(p.stock_quantity) || 0,
      is_serialized: false,
    }));

    // Query filters
    const { q, category_id, brand_id, supplier_id, status, low_stock, out_of_stock } = req.query || {};

    let filtered = productMap;

    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
      );
    }
    if (category_id) filtered = filtered.filter((p) => p.category_id === category_id);
    if (brand_id) filtered = filtered.filter((p) => p.brand_id === brand_id);
    if (supplier_id) filtered = filtered.filter((p) => p.supplier_id === supplier_id);
    if (status === 'active') filtered = filtered.filter((p) => p.is_active !== 'false');
    if (status === 'inactive') filtered = filtered.filter((p) => p.is_active === 'false');
    if (low_stock === 'true') {
      filtered = filtered.filter((p) =>
        Number(p.stock_quantity) <= Number(p.min_stock_level) &&
        Number(p.stock_quantity) > 0
      );
    }
    if (out_of_stock === 'true') {
      filtered = filtered.filter((p) => Number(p.stock_quantity) === 0);
    }

    return ok(res, { products: filtered, total: filtered.length });
  }

  if (req.method === 'POST') {
    // ── Create product ─────────────────────────────────
    requireAuth(req, 'products.create');

    const data = validate(CreateProductSchema, req.body);

    // Resolve names
    const brand = await findOne('Brands', 'brand_id', data.brand_id);
    const category = await findOne('Categories', 'category_id', data.category_id);
    const subcategory = data.subcategory_id
      ? await findOne('Subcategories', 'subcategory_id', data.subcategory_id)
      : null;
    const supplier = data.supplier_id
      ? await findOne('Suppliers', 'supplier_id', data.supplier_id)
      : null;

    const product_id = await generateId('PROD', 'Products', 'product_id');
    const now = new Date().toISOString();

    const newProduct = {
      product_id,
      name: data.name,
      brand_id: data.brand_id,
      brand_name: brand?.name || '',
      category_id: data.category_id,
      category_name: category?.name || '',
      subcategory_id: data.subcategory_id || '',
      subcategory_name: subcategory?.name || '',
      model: data.model,
      sku: data.sku,
      barcode: data.barcode,
      description: data.description,
      supplier_id: data.supplier_id || '',
      supplier_name: supplier?.name || '',
      purchase_cost: data.purchase_cost,
      retail_price: data.retail_price,
      wholesale_price: data.wholesale_price,
      stock_quantity: Number(data.stock_quantity) || 0,
      min_stock_level: data.min_stock_level,
      storage_location: data.storage_location,
      image_url: '',
      is_serialized: false,
      is_active: data.is_active,
      product_type: data.product_type,
      ram: data.ram,
      internal_storage: data.internal_storage,
      color: data.color,
      condition: data.condition,
      warranty_duration: data.warranty_duration,
      network_config: data.network_config,
      created_at: now,
      updated_at: now,
    };

    await appendRow('Products', newProduct);

    // Log activity
    try {
      const { logActivity } = await import('../lib/activity.js');
      await logActivity(user, 'create', 'product', product_id, `Created product: ${data.name}`);
    } catch { /* non-critical */ }

    return ok(res, { product: newProduct }, 'Product created successfully', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
