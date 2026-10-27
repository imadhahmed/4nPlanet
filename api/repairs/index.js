// api/repairs/index.js
import { readSheet, appendRow, generateId } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CreateRepairSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'repairs.view');

  if (req.method === 'GET') {
    const repairs = await readSheet('Repair_Jobs');
    const { q, status, technician_id } = req.query || {};
    let filtered = repairs;
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((r) =>
        r.customer_name?.toLowerCase().includes(term) ||
        r.job_number?.toLowerCase().includes(term) ||
        r.model?.toLowerCase().includes(term) ||
        r.imei?.toLowerCase().includes(term)
      );
    }
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (technician_id) filtered = filtered.filter((r) => r.assigned_technician_id === technician_id);
    return ok(res, { repairs: filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)), total: filtered.length });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'repairs.create');
    const data = validate(CreateRepairSchema, req.body);
    const job_id = await generateId('REP', 'Repair_Jobs', 'job_id');
    const repairsCount = (await readSheet('Repair_Jobs')).length;
    const job_number = `JOB-${String(repairsCount + 1).padStart(6, '0')}`;
    const now = new Date().toISOString();
    const job = {
      job_id, job_number,
      ...data,
      final_cost: 0,
      labor_charges: 0,
      payment_status: 'unpaid',
      status: 'received',
      date_received: now.split('T')[0],
      completed_date: '',
      diagnosis: '',
      created_by: user.user_id,
      created_at: now,
      updated_at: now,
    };
    await appendRow('Repair_Jobs', job);
    return ok(res, { job }, 'Repair job created', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
