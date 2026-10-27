// api/activity-logs/index.js
import { readSheet } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  requireAuth(req, 'settings.view');

  if (req.method === 'GET') {
    const logs = await readSheet('Activity_Logs');
    const { limit = '100', offset = '0' } = req.query || {};
    const sorted = logs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const paginated = sorted.slice(Number(offset), Number(offset) + Number(limit));
    return ok(res, { logs: paginated, total: logs.length });
  }

  return fail(res, 'Method not allowed', 405);
});
