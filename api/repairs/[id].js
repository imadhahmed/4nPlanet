// api/repairs/[id].js
// GET /api/repairs/:id — get repair job ticket
// PUT /api/repairs/:id — update repair job status/diagnosis/charges
// POST /api/repairs/:id/parts — attach replacement parts

import { readSheet, findOne, appendRow, updateRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'repairs.view');
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'Repair ID required', 400);

  const repair = await findOne('Repair_Jobs', 'job_id', id);
  if (!repair) return fail(res, 'Repair job not found', 404);

  const parts = await readSheet('Repair_Parts');
  const repairParts = parts.filter((p) => p.job_id === id);

  if (action === 'parts' && req.method === 'POST') {
    requireAuth(req, 'repairs.edit');
    const { product_id, part_name, quantity, unit_price } = req.body;
    const qty = Number(quantity) || 1;
    const price = Number(unit_price) || 0;

    const part_id = await generateId('RPT', 'Repair_Parts', 'part_id');
    const now = new Date().toISOString();

    const partItem = {
      part_id,
      job_id: id,
      product_id: product_id || '',
      part_name: part_name || 'Replacement Component',
      quantity: qty,
      unit_price: price,
      total_price: qty * price,
      created_at: now,
    };

    await appendRow('Repair_Parts', partItem);

    // If linked to inventory product, deduct stock
    if (product_id) {
      const prod = await findOne('Products', 'product_id', product_id);
      if (prod) {
        const curStock = Number(prod.stock_quantity) || 0;
        await updateRow('Products', 'product_id', product_id, {
          stock_quantity: Math.max(0, curStock - qty),
          updated_at: now,
        });
      }
    }

    // Recalculate final cost
    const updatedParts = [...repairParts, partItem];
    const partsCost = updatedParts.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);
    const labor = Number(repair.labor_charges) || 0;
    const finalCost = partsCost + labor;

    await updateRow('Repair_Jobs', 'job_id', id, {
      parts_cost: partsCost,
      final_cost: finalCost,
      updated_at: now,
    });

    return ok(res, { part: partItem, final_cost: finalCost }, 'Part attached to repair job', 201);
  }

  if (req.method === 'GET') {
    return ok(res, {
      job: {
        ...repair,
        parts: repairParts,
      },
    });
  }

  if (req.method === 'PUT') {
    requireAuth(req, 'repairs.edit');
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.job_id;

    if (updates.labor_charges !== undefined || updates.parts_cost !== undefined) {
      const labor = Number(updates.labor_charges !== undefined ? updates.labor_charges : repair.labor_charges) || 0;
      const partsCost = Number(updates.parts_cost !== undefined ? updates.parts_cost : repair.parts_cost) || 0;
      updates.final_cost = labor + partsCost;
    }

    if (updates.status === 'ready' || updates.status === 'collected') {
      if (!repair.completed_date) {
        updates.completed_date = new Date().toISOString().split('T')[0];
      }
    }

    await updateRow('Repair_Jobs', 'job_id', id, updates);
    await logActivity(user, 'update', 'repair', id, `Updated repair job ${repair.job_number} status to ${updates.status || repair.status}`);

    return ok(res, { job: { ...repair, ...updates } }, 'Repair job updated');
  }

  if (req.method === 'DELETE') {
    requireAuth(req, 'repairs.manage');
    const { deleteRow } = await import('../lib/sheets.js');
    await deleteRow('Repair_Jobs', 'job_id', id);
    await logActivity(user, 'delete', 'repair', id, `Deleted repair job ${repair.job_number}`);
    return ok(res, {}, 'Repair job deleted');
  }

  return fail(res, 'Method not allowed', 405);
});
