// src/pages/categories/Categories.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, Folder, Edit2, Trash2, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { categories as categoriesApi } from '../../services/api.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    categoriesApi.list()
      .then((res) => {
        setCategories(res.data.data.categories || []);
      })
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '', is_active: true });
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      is_active: String(cat.is_active) !== 'false',
    });
    setShowModal(true);
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${cat.name}"?`)) return;
    try {
      await categoriesApi.delete(cat.category_id);
      toast.success('Category removed successfully');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required');

    setSubmitting(true);
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.category_id, form);
        toast.success('Category updated successfully');
      } else {
        await categoriesApi.create(form);
        toast.success('Category created successfully');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = categories.filter((c) =>
    c.name?.toLowerCase().includes(q.toLowerCase()) ||
    c.description?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize smartphones, accessories, and spare parts</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Category
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
              placeholder="Search categories..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading categories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Folder size={24} /></div>
            <h3>No categories found</h3>
            <p>Create categories to organize your shop inventory</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Subcategories</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => {
                  const isActive = String(cat.is_active) !== 'false';
                  return (
                    <tr key={cat.category_id}>
                      <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Layers size={15} style={{ color: 'var(--primary)' }} />
                          {cat.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{cat.description || '—'}</td>
                      <td>
                        <span className="badge badge-gray">
                          {cat.subcategories?.length || 0} subcategories
                        </span>
                      </td>
                      <td>
                        <span className={clsx('badge', isActive ? 'badge-green' : 'badge-gray')}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => openEditModal(cat)}
                            title="Edit Category"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteCategory(cat)}
                            title="Delete Category"
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

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Smart Phones, Audio, Chargers"
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
                    placeholder="Brief description of products in this category..."
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
                    <span>Active category</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
