// src/pages/suppliers/SupplierDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Truck, Phone, Mail, MapPin, Eye, ShoppingCart, Trash2 } from 'lucide-react';
import { suppliers as suppliersApi } from '../../services/api.js';
import { formatCurrency, formatDate, paymentStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [saving, setSaving] = useState(false);

  const fetchSupplier = () => {
    setLoading(true);
    suppliersApi.get(id)
      .then((res) => {
        const s = res.data.data.supplier;
        setSupplier(s);
        setForm({
          name: s.name || '',
          contact_person: s.contact_person || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
        });
      })
      .catch(() => {
        toast.error('Failed to load supplier');
        navigate('/suppliers');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await suppliersApi.update(id, form);
      toast.success('Supplier updated successfully');
      setShowEditModal(false);
      fetchSupplier();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete or deactivate supplier "${supplier.name}"?`)) return;
    try {
      await suppliersApi.delete(id);
      toast.success('Supplier removed or deactivated');
      navigate('/suppliers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p>Loading supplier profile...</p>
      </div>
    );
  }

  if (!supplier) return null;

  const purchases = supplier.purchases || [];
  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (Number(p.total_cost) || 0), 0);
  const outstanding = Number(supplier.outstanding_balance) || 0;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/suppliers')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{supplier.name}</h1>
            <p className="page-subtitle">Supplier ID: {supplier.supplier_id}</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <Edit2 size={15} /> Edit Supplier
          </button>
          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={handleDelete} title="Delete Supplier">
            <Trash2 size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/purchases/new')}>
            <ShoppingCart size={15} /> New Purchase Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <span className="kpi-label">Total Purchased</span>
          <span className="kpi-value">{formatCurrency(totalPurchasesAmount)}</span>
          <span className="kpi-sub">{purchases.length} orders recorded</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding Payable</span>
          <span className={clsx('kpi-value', outstanding > 0 ? 'text-danger' : '')}>
            {formatCurrency(outstanding)}
          </span>
          <span className="kpi-sub">{outstanding === 0 ? 'Fully Paid' : 'Pending Payable'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Contact Person</span>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <div style={{ fontWeight: 600 }}>{supplier.contact_person || 'Not specified'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{supplier.phone || supplier.email || '—'}</div>
          </div>
        </div>
      </div>

      {/* Purchase Orders Ledger */}
      <div className="card">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Purchase Orders & Deliveries</h2>
        {purchases.length === 0 ? (
          <div className="empty-state">
            <Truck size={36} />
            <p>No purchase records found for this supplier.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.purchase_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.purchase_number}</td>
                    <td>{formatDate(p.purchase_date || p.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.total_cost)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success-600)' }}>{formatCurrency(p.amount_paid)}</td>
                    <td style={{ textAlign: 'right', color: Number(p.outstanding_balance) > 0 ? 'var(--danger-600)' : 'inherit' }}>
                      {formatCurrency(p.outstanding_balance || 0)}
                    </td>
                    <td>
                      <span className={clsx('badge', paymentStatusBadge(p.payment_status))}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => navigate(`/purchases/${p.purchase_id}`)}
                        title="View Purchase"
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

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Supplier</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Supplier Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
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
