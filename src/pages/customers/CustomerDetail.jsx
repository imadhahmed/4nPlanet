// src/pages/customers/CustomerDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Phone, Mail, MapPin, ShoppingBag, Eye, Calendar, Trash2 } from 'lucide-react';
import { customers as customersApi } from '../../services/api.js';
import { formatCurrency, formatDate, paymentStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', customer_type: 'registered' });
  const [saving, setSaving] = useState(false);

  const fetchCustomer = () => {
    setLoading(true);
    customersApi.get(id)
      .then((res) => {
        const c = res.data.data.customer;
        setCustomer(c);
        setForm({
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          customer_type: c.customer_type || 'registered',
        });
      })
      .catch(() => {
        toast.error('Failed to load customer');
        navigate('/customers');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customersApi.update(id, form);
      toast.success('Customer updated successfully');
      setShowEditModal(false);
      fetchCustomer();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete or deactivate customer "${customer.name}"?`)) return;
    try {
      await customersApi.delete(id);
      toast.success('Customer account deleted or deactivated');
      navigate('/customers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p>Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) return null;

  const outstanding = Number(customer.outstanding_balance) || 0;
  const sales = customer.sales || [];
  const totalSalesAmount = sales.reduce((sum, s) => sum + (Number(s.grand_total) || 0), 0);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/customers')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="page-title">{customer.name}</h1>
              <span className={clsx('badge', customer.customer_type === 'wholesale' ? 'badge-purple' : 'badge-blue')}>
                {customer.customer_type || 'registered'}
              </span>
            </div>
            <p className="page-subtitle">Customer Account ID: {customer.customer_id}</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 size={15} /> Edit Profile
          </button>
          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={handleDelete} title="Delete Customer">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <span className="kpi-label">Lifetime Purchases</span>
          <span className="kpi-value">{formatCurrency(totalSalesAmount || customer.total_purchases || 0)}</span>
          <span className="kpi-sub">{sales.length} invoices recorded</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding Credit Balance</span>
          <span className={clsx('kpi-value', outstanding > 0 ? 'text-danger' : '')}>
            {formatCurrency(outstanding)}
          </span>
          <span className="kpi-sub">{outstanding === 0 ? 'Zero Balance' : 'Amount Due'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Contact Details</span>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <div>{customer.phone || 'No phone'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{customer.email || 'No email'}</div>
          </div>
        </div>
      </div>

      {/* Sales History */}
      <div className="card">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Purchase & Invoice History</h2>
        {sales.length === 0 ? (
          <div className="empty-state">
            <ShoppingBag size={36} />
            <p>No purchase records found for this customer.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.sale_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.invoice_number}</td>
                    <td>{formatDate(s.sale_date || s.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.grand_total)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success-600)' }}>{formatCurrency(s.amount_paid)}</td>
                    <td style={{ textAlign: 'right', color: Number(s.outstanding_balance) > 0 ? 'var(--danger-600)' : 'inherit' }}>
                      {formatCurrency(s.outstanding_balance || 0)}
                    </td>
                    <td>
                      <span className={clsx('badge', paymentStatusBadge(s.payment_status))}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => navigate(`/sales/${s.sale_id}`)}
                        title="View Invoice"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Customer Profile</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <select
                    className="form-select"
                    value={form.customer_type}
                    onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
                  >
                    <option value="registered">Registered Retail</option>
                    <option value="wholesale">Wholesale Buyer</option>
                    <option value="walk_in">Walk-in</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
