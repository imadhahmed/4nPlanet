// src/pages/purchases/PurchaseDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, CreditCard, ShoppingBag, Truck, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { purchases as purchasesApi, payments as paymentsApi } from '../../services/api.js';
import { formatCurrency, formatDate, formatDateTime, paymentStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function PurchaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_note: '',
  });
  const [paying, setPaying] = useState(false);

  const fetchPurchase = () => {
    setLoading(true);
    purchasesApi.get(id)
      .then((res) => {
        setPurchase(res.data.data.purchase);
      })
      .catch(() => {
        toast.error('Failed to load purchase');
        navigate('/purchases');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPurchase();
  }, [id]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) return toast.error('Please enter a valid amount');
    if (amt > Number(purchase.outstanding_balance)) {
      return toast.error('Payment cannot exceed outstanding balance');
    }

    setPaying(true);
    try {
      await paymentsApi.create({
        related_id: id,
        payment_type: 'purchase_payment',
        amount: amt,
        payment_method: payForm.payment_method,
        notes: payForm.reference_note,
      });

      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPayForm({ amount: '', payment_method: 'cash', reference_note: '' });
      fetchPurchase();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleDeletePurchase = async () => {
    setDeleting(true);
    try {
      await purchasesApi.delete(id);
      toast.success('Purchase cancelled/deleted successfully');
      navigate('/purchases');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p>Loading purchase details...</p>
      </div>
    );
  }

  if (!purchase) return null;

  const outstanding = Number(purchase.outstanding_balance) || 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/purchases')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="page-title">{purchase.purchase_number}</h1>
              <span className={clsx('badge', paymentStatusBadge(purchase.payment_status))}>
                {purchase.payment_status || 'unpaid'}
              </span>
            </div>
            <p className="page-subtitle">Goods Received Note (GRN)</p>
          </div>
        </div>
        <div className="page-actions">
          {outstanding > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowPaymentModal(true)}>
              <CreditCard size={15} /> Record Payment
            </button>
          )}
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print GRN
          </button>
          <button className="btn btn-danger btn-icon" onClick={() => setShowDeleteModal(true)} title="Cancel / Delete Purchase">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <span className="kpi-label">Total Purchase Cost</span>
          <span className="kpi-value">{formatCurrency(purchase.total_cost || 0)}</span>
          <span className="kpi-sub">Subtotal: {formatCurrency(purchase.subtotal || 0)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Amount Paid</span>
          <span className="kpi-value" style={{ color: 'var(--success-600)' }}>
            {formatCurrency(purchase.amount_paid || 0)}
          </span>
          <span className="kpi-sub">Method: {purchase.payment_method || 'Cash'}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding Balance</span>
          <span className={clsx('kpi-value', outstanding > 0 ? 'text-danger' : '')}>
            {formatCurrency(outstanding)}
          </span>
          <span className="kpi-sub">{outstanding === 0 ? 'Fully Settled' : 'Payment Pending'}</span>
        </div>
      </div>

      {/* Details Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Purchase & Supplier Info</h2>
        <div className="grid-3" style={{ gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supplier:</span>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{purchase.supplier_name || '—'}</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Purchase Date:</span>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{formatDate(purchase.purchase_date)}</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supplier Bill / Ref #:</span>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{purchase.reference_number || '—'}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Received Items</h2>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Product Description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Cost</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((it, idx) => (
                <tr key={it.purchase_item_id || idx}>
                  <td style={{ fontWeight: 500 }}>{it.product_name || it.product_id}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(it.unit_cost)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(Number(it.unit_cost) * Number(it.quantity) - Number(it.discount || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments History */}
      {purchase.payments && purchase.payments.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Payment Transactions</h2>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference / Note</th>
                  <th style={{ textAlign: 'right' }}>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {purchase.payments.map((p, idx) => (
                  <tr key={p.payment_id || idx}>
                    <td>{formatDate(p.payment_date || p.created_at)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.payment_method}</td>
                    <td>{p.reference_note || p.notes || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-600)' }}>
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Supplier Payment</h3>
              <button className="btn-close" onClick={() => setShowPaymentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Outstanding Balance: <strong>{formatCurrency(outstanding)}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Payment Amount (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={outstanding}
                    className="form-input"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reference / Cheque Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CHQ-449102"
                    value={payForm.reference_note}
                    onChange={(e) => setPayForm({ ...payForm, reference_note: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={paying}>
                  {paying ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cancel / Delete Purchase</h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel purchase order <strong>{purchase.purchase_number}</strong>?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                Supplier: <strong>{purchase.supplier_name || 'N/A'}</strong> · Total: <strong>{formatCurrency(purchase.total_cost || 0)}</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
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
