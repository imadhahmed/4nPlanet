// api/sales/[id].js
// GET /api/sales/:id — get sale/invoice details
// GET /api/sales/:id/items — get sale items
// POST /api/sales/:id/cancel — cancel sale and revert inventory
// POST /api/sales/:id/returns — process return items
// POST /api/sales/:id/payments — pay remaining balance

import {
  readSheet, findOne, updateRow, appendRow, generateId
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'Sale ID required', 400);

  const sale = await findOne('Sales', 'sale_id', id);
  if (!sale) return fail(res, 'Sale not found', 404);

  const items = await readSheet('Sale_Items');
  const saleItems = items.filter((i) => i.sale_id === id);

  if (action === 'items' && req.method === 'GET') {
    return ok(res, { items: saleItems });
  }

  // Cancel sale
  if (action === 'cancel' && req.method === 'POST') {
    requireAuth(req, 'sales.cancel');
    if (sale.sale_status === 'cancelled') {
      return fail(res, 'Sale is already cancelled', 400);
    }

    const { reason } = req.body;
    const now = new Date().toISOString();

    // Revert stock for non-serialized and serialized items
    const products = await readSheet('Products');
    const serials = await readSheet('Serials');

    for (const item of saleItems) {
      const prod = products.find((p) => p.product_id === item.product_id);
      if (prod) {
        if (prod.is_serialized === 'true') {
          // Revert serial status
          if (item.serial_id) {
            await updateRow('Serials', 'serial_id', item.serial_id, {
              status: 'available',
              updated_at: now,
            });
          }
        } else {
          const newQty = (Number(prod.stock_quantity) || 0) + (Number(item.quantity) || 1);
          await updateRow('Products', 'product_id', prod.product_id, {
            stock_quantity: newQty,
            updated_at: now,
          });
        }
      }
    }

    await updateRow('Sales', 'sale_id', id, {
      sale_status: 'cancelled',
      notes: `${sale.notes || ''} [Cancelled: ${reason || 'No reason provided'}]`,
      updated_at: now,
    });

    await logActivity(user, 'cancel', 'sale', id, `Cancelled sale ${sale.invoice_number} - ${reason || ''}`);

    return ok(res, {}, 'Sale cancelled and stock restored');
  }

  // Returns
  if (action === 'returns' && req.method === 'POST') {
    requireAuth(req, 'sales.return');
    const { items: returnItems, refund_amount, return_reason } = req.body;
    const now = new Date().toISOString();

    const return_id = await generateId('RET', 'Returns', 'return_id');
    await appendRow('Returns', {
      return_id,
      sale_id: id,
      invoice_number: sale.invoice_number,
      refund_amount: Number(refund_amount) || 0,
      reason: return_reason || '',
      created_by: user.user_id,
      created_at: now,
    });

    // Revert inventory for returned items
    for (const ret of returnItems || []) {
      const saleItem = saleItems.find((i) => i.sale_item_id === ret.sale_item_id);
      if (saleItem) {
        if (saleItem.serial_id) {
          await updateRow('Serials', 'serial_id', saleItem.serial_id, {
            status: ret.condition === 'defective' ? 'defective' : 'available',
            updated_at: now,
          });
        } else {
          const prod = await findOne('Products', 'product_id', saleItem.product_id);
          if (prod && ret.condition !== 'defective') {
            await updateRow('Products', 'product_id', prod.product_id, {
              stock_quantity: (Number(prod.stock_quantity) || 0) + (Number(ret.quantity) || 1),
              updated_at: now,
            });
          }
        }
      }
    }

    await updateRow('Sales', 'sale_id', id, {
      sale_status: 'returned',
      updated_at: now,
    });

    await logActivity(user, 'return', 'sale', id, `Processed return for sale ${sale.invoice_number}`);
    return ok(res, { return_id }, 'Return processed successfully');
  }

  // Default GET
  if (req.method === 'GET') {
    const payments = await readSheet('Payments');
    const salePayments = payments.filter((p) => p.related_id === id);

    return ok(res, {
      sale: {
        ...sale,
        items: saleItems,
        payments: salePayments,
      },
    });
  }

  // DELETE /api/sales/:id — cancel/delete sale and revert inventory
  if (req.method === 'DELETE') {
    requireAuth(req, 'sales.cancel');
    const now = new Date().toISOString();

    const products = await readSheet('Products');
    for (const item of saleItems) {
      const prod = products.find((p) => p.product_id === item.product_id);
      if (prod) {
        const newQty = (Number(prod.stock_quantity) || 0) + (Number(item.quantity) || 1);
        await updateRow('Products', 'product_id', prod.product_id, {
          stock_quantity: newQty,
          updated_at: now,
        });
      }
    }

    await updateRow('Sales', 'sale_id', id, {
      sale_status: 'cancelled',
      notes: `${sale.notes || ''} [Cancelled/Deleted]`,
      updated_at: now,
    });

    await logActivity(user, 'delete', 'sale', id, `Cancelled/deleted sale ${sale.invoice_number}`);
    return ok(res, {}, 'Sale cancelled/deleted and stock reverted');
  }

  return fail(res, 'Method not allowed', 405);
});
