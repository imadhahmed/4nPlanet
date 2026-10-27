// src/pages/suppliers/SupplierList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Truck, Eye, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { suppliers as suppliersApi } from '../../services/api.js';
import { formatCurrency } from '../../utils/format.js';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

export default function SupplierList() {
  const navigate = useNavigate();
  const [supplierList, setSupplierList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');

  // Add / Edit Supplier Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = () => {
    setLoading(true);
    suppliersApi.list({ q })
      .then((res) => {
        setSupplierList(res.data.data.suppliers || []);
      })
      .catch(() => toast.error('Failed to load suppliers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
    setPage(1);
  }, [q]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (s) => {
    setEditingSupplier(s);
    setForm({
      name: s.name || '',
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = async (s) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${s.name}"?`)) return;
    try {
      await suppliersApi.delete(s.supplier_id);
      toast.success('Supplier removed or deactivated');
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Supplier name is required');

    setSubmitting(true);
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.supplier_id, form);
        toast.success('Supplier details updated');
      } else {
        await suppliersApi.create(form);
        toast.success('Supplier added successfully');
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const paginated = supplierList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(supplierList.length / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage device importers, distributors, and payables</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Supplier
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
              placeholder="Search by name, contact, phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading suppliers...</p>
          </div>
        ) : supplierList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Truck size={24} /></div>
            <h3>No suppliers registered</h3>
            <p>Add suppliers to track purchase orders and accounts payable</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Outstanding Payable</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s) => (
                  <tr key={s.supplier_id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Truck size={15} style={{ color: 'var(--primary)' }} />
                        {s.name}
                      </div>
                    </td>
                    <td>{s.contact_person || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                    <td style={{ textAlign: 'right', color: Number(s.outstanding_balance) > 0 ? 'var(--danger)' : 'inherit', fontWeight: Number(s.outstanding_balance) > 0 ? 700 : 400 }}>
                      {formatCurrency(s.outstanding_balance || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => navigate(`/suppliers/${s.supplier_id}`)}
                          title="View Supplier Profile"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => openEditModal(s)}
                          title="Edit Supplier"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteSupplier(s)}
                          title="Delete Supplier"
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
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, supplierList.length)} of {supplierList.length}
            </span>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className="page-btn" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Supplier / Company Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Abans PLC, Singer, TechDistributors"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Account Manager / Rep"
                      value={form.contact_person}
                      onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="011 / 07X XXXXXXX"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="orders@supplier.lk"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Physical Address</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Warehouse / Office address..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment & Order Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Credit period (e.g. 30 days), bank info..."
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
                  {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
