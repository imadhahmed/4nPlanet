// src/pages/purchases/PurchaseList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, ShoppingCart, Filter, Calendar, Trash2 } from 'lucide-react';
import { purchases as purchasesApi, suppliers as suppliersApi } from '../../services/api.js';
import { formatCurrency, formatDate, paymentStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 15;

export default function PurchaseList() {
  const navigate = useNavigate();
  const [purchaseList, setPurchaseList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    suppliersApi.list({ active_only: true })
      .then((res) => setSupplierList(res.data.data.suppliers || []))
      .catch(() => {});
  }, []);

  const fetchPurchases = () => {
    setLoading(true);
    purchasesApi.list({ q, supplier_id: supplierId, status })
      .then((res) => {
        let data = res.data.data.purchases || [];
        if (paymentStatus) {
          data = data.filter((p) => p.payment_status === paymentStatus);
        }
        setPurchaseList(data);
      })
      .catch(() => toast.error('Failed to load purchases'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPurchases();
    setPage(1);
  }, [q, supplierId, status, paymentStatus]);

  const paginated = purchaseList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(purchaseList.length / PAGE_SIZE);

  const handleDeletePurchase = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await purchasesApi.delete(deleteTarget.purchase_id);
      toast.success('Purchase order cancelled/deleted');
      setDeleteTarget(null);
      fetchPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases & GRN</h1>
          <p className="page-subtitle">Manage supplier purchase orders, stock arrivals, and payables</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/purchases/new')}>
            <Plus size={16} /> New Purchase
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ minWidth: 260 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search PO #, supplier..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">All Suppliers</option>
            {supplierList.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading purchases...</p>
          </div>
        ) : purchaseList.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={36} />
            <p>No purchase records found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th style={{ textAlign: 'right' }}>Paid</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.purchase_id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {p.purchase_number}
                    </td>
                    <td>{formatDate(p.purchase_date || p.created_at)}</td>
                    <td style={{ fontWeight: 500 }}>{p.supplier_name || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(p.total_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--success-600)' }}>
                      {formatCurrency(p.amount_paid || 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: Number(p.outstanding_balance) > 0 ? 'var(--danger-600)' : 'inherit', fontWeight: Number(p.outstanding_balance) > 0 ? 600 : 400 }}>
                      {formatCurrency(p.outstanding_balance || 0)}
                    </td>
                    <td>
                      <span className={clsx('badge', p.status === 'received' ? 'badge-green' : 'badge-amber')}>
                        {p.status || 'received'}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('badge', paymentStatusBadge(p.payment_status))}>
                        {p.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => navigate(`/purchases/${p.purchase_id}`)}
                        title="View Purchase Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(p)}
                        title="Cancel / Delete Purchase"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, purchaseList.length)} of {purchaseList.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cancel / Delete Purchase</h3>
              <button className="btn-close" onClick={() => setDeleteTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel purchase order <strong>{deleteTarget.purchase_number}</strong>?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                Supplier: <strong>{deleteTarget.supplier_name || 'N/A'}</strong> · Amount: <strong>{formatCurrency(deleteTarget.total_cost || 0)}</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeletePurchase} disabled={deleting}>
                {deleting ? 'Processing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
