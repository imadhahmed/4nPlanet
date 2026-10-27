// api/auth/login.js
// POST /api/auth/login

import { findOne } from '../lib/sheets.js';
import { verifyPassword, createSessionToken, buildSessionCookie } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, LoginSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  if (req.method !== 'POST') return fail(res, 'Method not allowed', 405);

  const { email, password } = validate(LoginSchema, req.body);

  const user = await findOne('Users', 'email', email.toLowerCase().trim());

  if (!user || user.is_active === 'false') {
    return fail(res, 'Invalid email or password', 401);
  }

  const passwordValid = verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    return fail(res, 'Invalid email or password', 401);
  }

  const token = createSessionToken(user);
  const cookie = buildSessionCookie(token);

  // Update last_login
  try {
    const { updateRow } = await import('../lib/sheets.js');
    await updateRow('Users', 'user_id', user.user_id, {
      last_login: new Date().toISOString(),
    });
  } catch {
    // Non-critical
  }

  res.setHeader('Set-Cookie', cookie);
  return ok(res, {
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  }, 'Login successful');
});
