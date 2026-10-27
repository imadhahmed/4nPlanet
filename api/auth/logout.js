// api/auth/logout.js
// POST /api/auth/logout

import { clearSessionCookie } from '../lib/auth.js';
import { ok, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  if (req.method !== 'POST') {
    const { fail } = await import('../lib/response.js');
    return fail(res, 'Method not allowed', 405);
  }

  res.setHeader('Set-Cookie', clearSessionCookie());
  return ok(res, {}, 'Logged out successfully');
});
