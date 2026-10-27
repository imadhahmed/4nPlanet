// src/pages/users/Users.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, UserCheck, Shield, KeyRound, UserX, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import { users as usersApi } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Users() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier',
    phone: '',
  });
  const [adding, setAdding] = useState(false);

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    role: 'cashier',
  });
  const [updating, setUpdating] = useState(false);

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    usersApi.list()
      .then((res) => {
        setUserList(res.data.data.users || []);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) return toast.error('Name is required');
    if (!addForm.email.trim()) return toast.error('Email is required');
    if (!addForm.password || addForm.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    setAdding(true);
    try {
      await usersApi.create(addForm);
      toast.success('Staff user created successfully');
      setShowAddModal(false);
      setAddForm({ name: '', email: '', password: '', role: 'cashier', phone: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      role: u.role || 'cashier',
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return toast.error('Name is required');

    setUpdating(true);
    try {
      await usersApi.update(editingUser.user_id, editForm);
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Are you sure you want to delete staff account "${u.name}" (${u.email})?`)) return;
    try {
      await usersApi.delete(u.user_id);
      toast.success('Staff user deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await usersApi.deactivate(u.user_id);
      toast.success(`User ${String(u.is_active) === 'false' ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      return toast.error('New password must be at least 8 characters');
    }

    setChangingPass(true);
    try {
      await usersApi.changePassword(selectedUser.user_id, { new_password: newPassword });
      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  const filtered = userList.filter((u) =>
    u.name?.toLowerCase().includes(q.toLowerCase()) ||
    u.email?.toLowerCase().includes(q.toLowerCase()) ||
    u.role?.toLowerCase().includes(q.toLowerCase())
  );

  const roleBadgeColor = {
    admin: 'badge-purple',
    manager: 'badge-blue',
    cashier: 'badge-green',
    stock_manager: 'badge-amber',
    technician: 'badge-cyan',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User & Staff Management</h1>
          <p className="page-subtitle">Manage store staff accounts, access levels, passwords, and permissions</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Staff User
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper" style={{ maxWidth: 300 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search staff name, email, role..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading staff users...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><UserCheck size={24} /></div>
            <h3>No staff users found</h3>
            <p>Create staff accounts to provide team access to the shop system</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isActive = String(u.is_active) !== 'false';
                  return (
                    <tr key={u.user_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={clsx('badge', roleBadgeColor[u.role] || 'badge-gray')} style={{ textTransform: 'capitalize' }}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <span className={clsx('badge', isActive ? 'badge-green' : 'badge-gray')}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {u.last_login ? formatDate(u.last_login) : 'Never'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Edit User"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Change Password"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('');
                              setShowPasswordModal(true);
                            }}
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            className={clsx('btn btn-ghost btn-sm btn-icon', !isActive && 'text-success')}
                            title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--danger)' }}
                            title="Delete User"
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Staff Account</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Staff Member Name"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="user@4nplanet.lk"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Role *</label>
                    <select
                      className="form-select"
                      value={addForm.role}
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    >
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      <option value="stock_manager">Stock Manager</option>
                      <option value="technician">Technician</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Password * (Min 8 characters)</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="07X XXXXXXX"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? 'Creating...' : 'Create Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Staff User</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Role *</label>
                    <select
                      className="form-select"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    >
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      <option value="stock_manager">Stock Manager</option>
                      <option value="technician">Technician</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Update Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password</h3>
              <button className="btn-close" onClick={() => setShowPasswordModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Updating password for <strong style={{ color: 'var(--navy-dark)' }}>{selectedUser?.name}</strong> ({selectedUser?.email})
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">New Password * (Min 8 characters)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={changingPass}>
                  {changingPass ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
