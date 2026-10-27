// src/pages/sales/SaleList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Download, Plus, Trash2 } from 'lucide-react';
import { sales as salesApi } from '../../services/api.js';
import { formatCurrency, formatDateTime, paymentStatusBadge, saleStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 20;

export default function SaleList() {
  const navigate = useNavigate();
  const [saleList, setSaleList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    salesApi.list({ q, from, to, payment_status: payStatus, limit: 200 })
      .then((res) => setSaleList(res.data.data.sales || []))
      .catch(() => toast.error('Failed to load sales'))
      .finally(() => setLoading(false));
  }, [q, from, to, payStatus]);

  const paginated = saleList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(saleList.length / PAGE_SIZE);
  const totalRevenue = saleList.reduce((s, sale) => s + Number(sale.grand_total || 0), 0);

  const handleDeleteSale = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await salesApi.delete(deleteTarget.sale_id);
      toast.success('Sale cancelled/deleted and inventory restored');
      setDeleteTarget(null);
      setLoading(true);
      salesApi.list({ q, from, to, payment_status: payStatus, limit: 200 })
        .then((res) => setSaleList(res.data.data.sales || []))
        .finally(() => setLoading(false));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel/delete sale');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">{saleList.length} sales · {formatCurrency(totalRevenue)} total</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/pos')}>
            <Plus size={16} /> New Sale
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-input-wrapper" style={{ maxWidth: 250 }}>
            <Search size={15} className="search-icon" />
            <input type="search" className="form-input" placeholder="Invoice, customer…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <input type="date" className="form-input" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" />
          <input type="date" className="form-input" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" />
          <select className="form-select" style={{ width: 150 }} value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 14, width: '80%' }} /></td>
                ))}</tr>
              ))}
              {!loading && paginated.length === 0 && (
                <tr><td colSpan={9}><div className="empty-state"><h3>No sales found</h3></div></td></tr>
              )}
              {!loading && paginated.map((s) => (
                <tr key={s.sale_id} onClick={() => navigate(`/sales/${s.sale_id}`)} style={{ cursor: 'pointer' }}>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--navy-700)', fontSize: 13 }}>{s.invoice_number}</td>
                  <td style={{ fontSize: 12 }}>{formatDateTime(s.sale_date)}</td>
                  <td style={{ fontSize: 13 }}>{s.customer_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.cashier_name}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(s.grand_total)}</td>
                  <td style={{ color: 'var(--success-600)', fontWeight: 600 }}>{formatCurrency(s.amount_paid)}</td>
                  <td style={{ color: Number(s.outstanding_balance) > 0 ? 'var(--danger-600)' : 'var(--gray-400)', fontWeight: 600 }}>
                    {formatCurrency(s.outstanding_balance)}
                  </td>
                  <td>
                    <span className={`badge ${paymentStatusBadge(s.payment_status)}`}>{s.payment_status}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/sales/${s.sale_id}`)} title="View Invoice">
                      <Eye size={15} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDeleteTarget(s)}
                      title="Cancel / Delete Sale"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span className="pagination-info">Showing {Math.min((page-1)*PAGE_SIZE+1, saleList.length)}–{Math.min(page*PAGE_SIZE, saleList.length)} of {saleList.length}</span>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page-1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={clsx('page-btn', { active: p === page })} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page+1)}>›</button>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cancel / Delete Sale</h3>
              <button className="btn-close" onClick={() => setDeleteTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel and delete invoice <strong>{deleteTarget.invoice_number}</strong>?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                Total amount: <strong>{formatCurrency(deleteTarget.grand_total)}</strong>. The items and quantities sold in this transaction will be automatically returned to inventory stock.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteSale} disabled={deleting}>
                {deleting ? 'Processing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
