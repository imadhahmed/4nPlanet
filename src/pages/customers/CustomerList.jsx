// src/pages/customers/CustomerList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, User, Eye, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { customers as customersApi } from '../../services/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 15;

export default function CustomerList() {
  const navigate = useNavigate();
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [q, setQ] = useState('');
  const [customerType, setCustomerType] = useState('');

  // Add / Edit Customer Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'registered',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = () => {
    setLoading(true);
    customersApi.list({ q, type: customerType })
      .then((res) => {
        setCustomerList(res.data.data.customers || []);
      })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
    setPage(1);
  }, [q, customerType]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({ name: '', phone: '', email: '', address: '', customer_type: 'registered', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingCustomer(c);
    setForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      customer_type: c.customer_type || 'registered',
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleDeleteCustomer = async (c) => {
    if (!window.confirm(`Are you sure you want to delete customer "${c.name}"?`)) return;
    try {
      await customersApi.delete(c.customer_id);
      toast.success('Customer removed or deactivated');
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Customer name is required');

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.customer_id, form);
        toast.success('Customer details updated');
      } else {
        await customersApi.create(form);
        toast.success('Customer registered successfully');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const paginated = customerList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(customerList.length / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer profiles, purchase history, and credit accounts</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ minWidth: 280 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search by name, phone, email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
          >
            <option value="">All Customer Types</option>
            <option value="walk_in">Walk-in</option>
            <option value="registered">Registered</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading customers...</p>
          </div>
        ) : customerList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><User size={24} /></div>
            <h3>No customers found</h3>
            <p>Register customers to track sales history and credit</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Total Purchases</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.customer_id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--primary-light)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11.5, fontWeight: 700,
                          }}
                        >
                          {c.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        {c.name}
                      </div>
                    </td>
                    <td>{c.phone || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.email || '—'}</td>
                    <td>
                      <span className={clsx('badge', c.customer_type === 'wholesale' ? 'badge-purple' : 'badge-blue')}>
                        {c.customer_type || 'registered'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(c.total_purchases || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: Number(c.outstanding_balance) > 0 ? 'var(--danger)' : 'inherit', fontWeight: Number(c.outstanding_balance) > 0 ? 700 : 400 }}>
                      {formatCurrency(c.outstanding_balance || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => navigate(`/customers/${c.customer_id}`)}
                          title="View Customer Profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => openEditModal(c)}
                          title="Edit Customer"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteCustomer(c)}
                          title="Delete Customer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span className="pagination-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, customerList.length)} of {customerList.length}
            </span>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={clsx('page-btn', { active: p === page })} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Customer or Business Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="07X XXXXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Account Type</label>
                    <select
                      className="form-select"
                      value={form.customer_type}
                      onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
                    >
                      <option value="registered">Registered</option>
                      <option value="wholesale">Wholesale / Trade</option>
                      <option value="walk_in">Walk-in</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="customer@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Address / Location</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Street, City, Postal Code"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Credit terms, special preferences..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
