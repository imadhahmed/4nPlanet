// api/users/index.js
import { readSheet, appendRow, updateRow, generateId, findOne } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { hashPassword } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, CreateUserSchema, UpdateUserSchema } from '../lib/validate.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'users.view');

  if (req.method === 'GET') {
    const users = await readSheet('Users');
    // Never return password_hash
    const safe = users.map(({ password_hash, ...u }) => u);
    return ok(res, { users: safe });
  }

  if (req.method === 'POST') {
    requireAuth(req, 'users.create');
    const data = validate(CreateUserSchema, req.body);

    // Check for duplicate email
    const existing = await findOne('Users', 'email', data.email.toLowerCase().trim());
    if (existing) return fail(res, 'Email already exists', 409);

    const user_id = await generateId('USR', 'Users', 'user_id');
    const now = new Date().toISOString();
    const newUser = {
      user_id,
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password_hash: hashPassword(data.password),
      role: data.role,
      is_active: true,
      phone: data.phone || '',
      created_at: now,
      updated_at: now,
      last_login: '',
    };
    await appendRow('Users', newUser);
    const { password_hash, ...safeUser } = newUser;
    return ok(res, { user: safeUser }, 'User created', 201);
  }

  return fail(res, 'Method not allowed', 405);
});
