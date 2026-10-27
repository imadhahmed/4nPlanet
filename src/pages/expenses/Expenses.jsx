// src/pages/expenses/Expenses.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Tag, Calendar, Edit2, Trash2 } from 'lucide-react';
import { expenses as expensesApi } from '../../services/api.js';
import { formatCurrency, formatDate, todayISO } from '../../utils/format.js';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

const EXPENSE_CATEGORIES = [
  'Shop Rent',
  'Electricity & Utilities',
  'Internet & Phone',
  'Staff Salaries & Commissions',
  'Repair Tools & Supplies',
  'Packaging & Stationery',
  'Transport & Delivery',
  'Refreshments & Tea',
  'Marketing & Advertising',
  'Maintenance & Repairs',
  'Other Expenses',
];

export default function Expenses() {
  const [expenseList, setExpenseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);

  // Filters
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: 'Shop Rent',
    amount: '',
    expense_date: todayISO(),
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = () => {
    setLoading(true);
    expensesApi.list({ q, category })
      .then((res) => {
        setExpenseList(res.data.data.expenses || []);
        setTotalAmount(res.data.data.total_amount || 0);
      })
      .catch(() => toast.error('Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExpenses();
    setPage(1);
  }, [q, category]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      category: 'Shop Rent',
      amount: '',
      expense_date: todayISO(),
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title || '',
      category: exp.category || 'Shop Rent',
      amount: exp.amount || '',
      expense_date: exp.expense_date ? exp.expense_date.split('T')[0] : todayISO(),
      payment_method: exp.payment_method || 'cash',
      reference_number: exp.reference_number || '',
      notes: exp.notes || '',
    });
    setShowModal(true);
  };

  const handleDeleteExpense = async (exp) => {
    if (!window.confirm(`Are you sure you want to delete expense "${exp.title}" (${formatCurrency(exp.amount)})?`)) return;
    try {
      await expensesApi.delete(exp.expense_id);
      toast.success('Expense record deleted');
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Expense title is required');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Please enter a valid amount');

    setSubmitting(true);
    try {
      if (editingExpense) {
        await expensesApi.update(editingExpense.expense_id, {
          ...form,
          amount: amt,
        });
        toast.success('Expense record updated');
      } else {
        await expensesApi.create({
          ...form,
          amount: amt,
        });
        toast.success('Expense recorded successfully');
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const paginated = expenseList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(expenseList.length / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track shop operational overheads and overhead disbursements</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Record Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid-2" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon red">
            <DollarSign size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Filtered Expenses</div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>
              {formatCurrency(totalAmount)}
            </div>
            <div className="stat-sub">{expenseList.length} expense items recorded</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <Calendar size={20} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Average per Expense</div>
            <div className="stat-value">
              {formatCurrency(expenseList.length ? totalAmount / expenseList.length : 0)}
            </div>
            <div className="stat-sub">Across all recorded items</div>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ minWidth: 260 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search expense title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading expenses...</p>
          </div>
        ) : expenseList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><DollarSign size={24} /></div>
            <h3>No expenses recorded</h3>
            <p>Log store overheads, utilities, and daily petty cash expenses</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Title / Purpose</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((exp) => (
                  <tr key={exp.expense_id}>
                    <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>{exp.title}</td>
                    <td>
                      <span className="badge badge-gray">{exp.category}</span>
                    </td>
                    <td>{formatDate(exp.expense_date || exp.created_at)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{exp.payment_method}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.reference_number || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                      {formatCurrency(exp.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => openEditModal(exp)}
                          title="Edit Expense"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteExpense(exp)}
                          title="Delete Expense"
                        >
                          <Trash2 size={14} />
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
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, expenseList.length)} of {expenseList.length}
            </span>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className="page-btn" onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expense Title / Description *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. October Shop Rent, Electricity Bill, Tea"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category *</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Amount (LKR) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Expense Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.expense_date}
                      onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-select"
                      value={form.payment_method}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Receipt / Reference Number (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. BILL-9832, TRF-001"
                    value={form.reference_number}
                    onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Additional context or notes..."
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
                  {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
