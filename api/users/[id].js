// api/users/[id].js
// PUT /api/users/:id — update user details (role, name, phone, is_active)
// POST /api/users/:id/deactivate — toggle active status
// POST /api/users/:id/change-password — update user password

import { findOne, updateRow } from '../lib/sheets.js';
import { requireAuth, hashPassword } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req, 'users.manage');
  const id = req.query.id;
  const action = req.query.action;

  if (!id) return fail(res, 'User ID required', 400);

  const targetUser = await findOne('Users', 'user_id', id);
  if (!targetUser) return fail(res, 'User not found', 404);

  // Deactivate
  if (action === 'deactivate' && req.method === 'POST') {
    if (id === user.user_id) return fail(res, 'You cannot deactivate your own account', 400);
    const newStatus = String(targetUser.is_active) === 'false' ? 'true' : 'false';
    await updateRow('Users', 'user_id', id, {
      is_active: newStatus,
      updated_at: new Date().toISOString(),
    });
    await logActivity(user, 'update', 'user', id, `${newStatus === 'true' ? 'Activated' : 'Deactivated'} user: ${targetUser.email}`);
    return ok(res, { is_active: newStatus }, `User account ${newStatus === 'true' ? 'activated' : 'deactivated'}`);
  }

  // Change Password
  if (action === 'change-password' && req.method === 'POST') {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return fail(res, 'Password must be at least 8 characters', 400);
    }
    await updateRow('Users', 'user_id', id, {
      password_hash: hashPassword(new_password),
      updated_at: new Date().toISOString(),
    });
    await logActivity(user, 'update', 'user', id, `Changed password for user: ${targetUser.email}`);
    return ok(res, {}, 'Password updated successfully');
  }

  // Update Profile / Role
  if (req.method === 'PUT') {
    const { name, phone, role, is_active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    await updateRow('Users', 'user_id', id, updates);
    await logActivity(user, 'update', 'user', id, `Updated profile for user: ${targetUser.email}`);
    return ok(res, { user: { ...targetUser, ...updates } }, 'User updated successfully');
  }

  if (req.method === 'DELETE') {
    if (id === user.user_id) return fail(res, 'You cannot delete your own account', 400);
    const { deleteRow } = await import('../lib/sheets.js');
    await deleteRow('Users', 'user_id', id);
    await logActivity(user, 'delete', 'user', id, `Deleted user: ${targetUser.email}`);
    return ok(res, {}, 'User deleted successfully');
  }

  return fail(res, 'Method not allowed', 405);
});
