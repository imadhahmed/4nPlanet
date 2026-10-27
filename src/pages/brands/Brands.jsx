// src/pages/brands/Brands.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, Award, Edit2, Trash2 } from 'lucide-react';
import { brands as brandsApi } from '../../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  const fetchBrands = () => {
    setLoading(true);
    brandsApi.list()
      .then((res) => {
        setBrands(res.data.data.brands || []);
      })
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const openCreateModal = () => {
    setEditingBrand(null);
    setForm({ name: '', description: '', is_active: true });
    setShowModal(true);
  };

  const openEditModal = (brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name || '',
      description: brand.description || '',
      is_active: String(brand.is_active) !== 'false',
    });
    setShowModal(true);
  };

  const handleDeleteBrand = async (brand) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${brand.name}"?`)) return;
    try {
      await brandsApi.delete(brand.brand_id);
      toast.success('Brand removed successfully');
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete brand');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Brand name is required');

    setSubmitting(true);
    try {
      if (editingBrand) {
        await brandsApi.update(editingBrand.brand_id, form);
        toast.success('Brand updated successfully');
      } else {
        await brandsApi.create(form);
        toast.success('Brand created successfully');
      }
      setShowModal(false);
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save brand');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = brands.filter((b) =>
    b.name?.toLowerCase().includes(q.toLowerCase()) ||
    b.description?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Brands</h1>
          <p className="page-subtitle">Manage phone and accessory manufacturers</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Brand
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrapper" style={{ maxWidth: 300 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search brands..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading brands...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Award size={24} /></div>
            <h3>No brands found</h3>
            <p>Create brands to categorize devices and accessories</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const isActive = String(b.is_active) !== 'false';
                  return (
                    <tr key={b.brand_id}>
                      <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Award size={15} style={{ color: 'var(--primary)' }} />
                          {b.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{b.description || '—'}</td>
                      <td>
                        <span className={clsx('badge', isActive ? 'badge-green' : 'badge-gray')}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEditModal(b)}
                            title="Edit Brand"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteBrand(b)}
                            title="Delete Brand"
                          >
                            <Trash2 size={14} />
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

      {/* Add / Edit Brand Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBrand ? 'Edit Brand' : 'Add New Brand'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Brand Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Apple, Samsung, Xiaomi, Anker"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Brief description or manufacturer notes..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--navy-dark)' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    <span>Active brand</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingBrand ? 'Update Brand' : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
