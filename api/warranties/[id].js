// api/warranties/[id].js
// GET /api/warranties/:id — get warranty details
// GET /api/warranties/:id/claims — get warranty claim history
// POST /api/warranties/:id/claims — submit a new warranty claim

import { readSheet, findOne, appendRow, updateRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'warranties.view');
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'Warranty ID required', 400);

  const warranty = await findOne('Warranties', 'warranty_id', id);
  if (!warranty) return fail(res, 'Warranty record not found', 404);

  const claims = await readSheet('Warranty_Claims');
  const warrantyClaims = claims.filter((c) => c.warranty_id === id);

  if (action === 'claims' && req.method === 'GET') {
    return ok(res, { claims: warrantyClaims });
  }

  if (action === 'claims' && req.method === 'POST') {
    requireAuth(req, 'warranties.claim');
    const { issue_description, claim_type, resolution_notes } = req.body;
    if (!issue_description) return fail(res, 'Issue description required', 400);

    const claim_id = await generateId('CLM', 'Warranty_Claims', 'claim_id');
    const now = new Date().toISOString();

    const claim = {
      claim_id,
      warranty_id: id,
      issue_description,
      claim_type: claim_type || 'repair',
      status: 'received',
      resolution_notes: resolution_notes || '',
      created_by: user.user_id,
      created_at: now,
      updated_at: now,
    };

    await appendRow('Warranty_Claims', claim);
    await updateRow('Warranties', 'warranty_id', id, {
      status: 'claimed',
      updated_at: now,
    });

    await logActivity(user, 'claim', 'warranty', id, `Filed warranty claim for device IMEI: ${warranty.imei1 || warranty.serial_number}`);

    return ok(res, { claim }, 'Warranty claim filed successfully', 201);
  }

  if (req.method === 'GET') {
    return ok(res, {
      warranty: {
        ...warranty,
        claims: warrantyClaims,
      },
    });
  }

  return fail(res, 'Method not allowed', 405);
});
