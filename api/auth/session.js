// api/auth/session.js
// GET /api/auth/session — returns current user if authenticated

import { getSessionFromRequest } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  if (req.method !== 'GET') return fail(res, 'Method not allowed', 405);

  const session = getSessionFromRequest(req);

  if (!session) {
    return fail(res, 'Not authenticated', 401);
  }

  return ok(res, {
    user: {
      user_id: session.user_id,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
});
