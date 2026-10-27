// api/warranties/index.js
import { readSheet } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  requireAuth(req, 'warranties.view');

  if (req.method === 'GET') {
    const warranties = await readSheet('Warranties');
    const { q, status } = req.query || {};
    let filtered = warranties;
    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter((w) =>
        w.imei1?.toLowerCase().includes(term) ||
        w.customer_name?.toLowerCase().includes(term) ||
        w.invoice_number?.toLowerCase().includes(term) ||
        w.product_name?.toLowerCase().includes(term)
      );
    }
    if (status) filtered = filtered.filter((w) => w.status === status);
    return ok(res, { warranties: filtered.sort((a, b) => b.created_at.localeCompare(a.created_at)), total: filtered.length });
  }

  return fail(res, 'Method not allowed', 405);
});
