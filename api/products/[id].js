// api/products/[id].js
// GET /api/products/:id — get product details (with serials and stock stats)
// PUT /api/products/:id — update product
// DELETE /api/products/:id — delete or deactivate product
// POST /api/products/:id/adjust — adjust stock quantity

import {
  readSheet, findOne, updateRow, deleteRow, appendRow, generateId
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'Product ID required', 400);

  const product = await findOne('Products', 'product_id', id);
  if (!product) return fail(res, 'Product not found', 404);

  // Sub-actions: /api/products/:id/serials
  if (action === 'serials' && req.method === 'GET') {
    const serials = await readSheet('Serials');
    const productSerials = serials.filter((s) => s.product_id === id);
    return ok(res, { serials: productSerials });
  }

  // Sub-actions: /api/products/:id/adjust
  if (action === 'adjust' && req.method === 'POST') {
    requireAuth(req, 'inventory.adjust');
    const { adjustment_type, quantity, reason, notes } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return fail(res, 'Valid adjustment quantity required', 400);

    const currentQty = Number(product.stock_quantity) || 0;
    const newQty = adjustment_type === 'add' ? currentQty + qty : Math.max(0, currentQty - qty);

    await updateRow('Products', 'product_id', id, {
      stock_quantity: newQty,
      updated_at: new Date().toISOString(),
    });

    // Record Stock Movement
    const movement_id = await generateId('MOV', 'Stock_Movements', 'movement_id');
    await appendRow('Stock_Movements', {
      movement_id,
      product_id: id,
      movement_type: adjustment_type === 'add' ? 'adjustment_in' : 'adjustment_out',
      quantity: qty,
      balance_after: newQty,
      reason: reason || 'Manual Stock Adjustment',
      notes: notes || '',
      created_by: user.user_id,
      created_at: new Date().toISOString(),
    });

    await logActivity(user, 'adjust_stock', 'product', id, `Adjusted stock by ${adjustment_type === 'add' ? '+' : '-'}${qty} (${reason})`);

    return ok(res, { stock_quantity: newQty }, 'Stock adjusted successfully');
  }

  if (req.method === 'GET') {
    const movements = await readSheet('Stock_Movements');
    const relatedMovements = movements.filter((m) => m.product_id === id);

    return ok(res, {
      product: {
        ...product,
        stock_quantity: Number(product.stock_quantity) || 0,
        is_serialized: false,
        movements: relatedMovements.slice(-20).reverse(),
      },
    });
  }

  if (req.method === 'PUT') {
    requireAuth(req, 'products.edit');
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.product_id;
    await updateRow('Products', 'product_id', id, updates);
    await logActivity(user, 'update', 'product', id, `Updated product: ${product.name}`);
    return ok(res, { product: { ...product, ...updates } }, 'Product updated successfully');
  }

  if (req.method === 'DELETE') {
    requireAuth(req, 'products.delete');
    // Check if sales exist
    const saleItems = await readSheet('Sale_Items');
    const hasSales = saleItems.some((i) => i.product_id === id);
    if (hasSales) {
      // Soft deactivate
      await updateRow('Products', 'product_id', id, { is_active: 'false', updated_at: new Date().toISOString() });
      return ok(res, {}, 'Product has sales history; marked as inactive instead of deleting');
    }
    await deleteRow('Products', 'product_id', id);
    await logActivity(user, 'delete', 'product', id, `Deleted product: ${product.name}`);
    return ok(res, {}, 'Product deleted successfully');
  }

  return fail(res, 'Method not allowed', 405);
});
