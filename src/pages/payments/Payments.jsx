// src/pages/payments/Payments.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus, Search, CreditCard, ArrowDownRight, ArrowUpRight,
  Filter, Calendar, Eye, Trash2, Printer, CheckCircle2, Wallet, Receipt
} from 'lucide-react';
import { payments as paymentsApi, customers as customersApi, suppliers as suppliersApi } from '../../services/api.js';
import { formatCurrency, formatDate, todayISO } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import logoImg from '../../assets/4N Planet POS System Logo.png';

const PAGE_SIZE = 15;

export default function Payments() {
  const [paymentsList, setPaymentsList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [q, setQ] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [method, setMethod] = useState('');

  // Record Payment Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    payment_type: 'customer_receipt',
    party_id: '',
    related_id: 'DIRECT',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    payment_date: todayISO(),
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // View Voucher Modal
  const [viewPayment, setViewPayment] = useState(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      customersApi.list(),
      suppliersApi.list(),
    ])
      .then(([cRes, sRes]) => {
        setCustomerList(cRes.data.data.customers || []);
        setSupplierList(sRes.data.data.suppliers || []);
      })
      .catch(() => {});
  }, []);

  const fetchPayments = () => {
    setLoading(true);
    paymentsApi.list({ q, type: paymentType, method })
      .then((res) => {
        setPaymentsList(res.data.data.payments || []);
      })
      .catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
    setPage(1);
  }, [q, paymentType, method]);

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!form.party_id) return toast.error('Please select customer or supplier');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Please enter a valid amount');

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        amount: amt,
        idempotency_key: `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
      await paymentsApi.create(payload);
      toast.success('Payment recorded successfully');
      setShowModal(false);
      setForm({
        payment_type: 'customer_receipt',
        party_id: '',
        related_id: 'DIRECT',
        amount: '',
        payment_method: 'cash',
        reference_number: '',
        payment_date: todayISO(),
        notes: '',
      });
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await paymentsApi.delete(deleteTarget.payment_id);
      toast.success('Payment record deleted');
      setDeleteTarget(null);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  const paginated = paymentsList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(paymentsList.length / PAGE_SIZE);

  // Totals
  const totalReceived = paymentsList
    .filter((p) => p.payment_type === 'customer_receipt' || p.payment_type === 'sale_payment')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPaidOut = paymentsList
    .filter((p) => p.payment_type === 'supplier_payment' || p.payment_type === 'purchase_payment')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoImg} alt="4N Planet" style={{ width: 42, height: 42, objectFit: 'contain' }} />
          <div>
            <h1 className="page-title">Payments & Receipts</h1>
            <p className="page-subtitle">Track customer payments, supplier settlements, and cash movement</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-label">Cash Inflow (Receipts)</span>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--success-light)', color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <span className="kpi-value" style={{ color: 'var(--success)' }}>
            +{formatCurrency(totalReceived)}
          </span>
          <span className="kpi-sub">Customer accounts & retail sales</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-label">Cash Outflow (Disbursements)</span>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--danger-light)', color: 'var(--danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <span className="kpi-value" style={{ color: 'var(--danger)' }}>
            -{formatCurrency(totalPaidOut)}
          </span>
          <span className="kpi-sub">Supplier settlements & payables</span>
        </div>

        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-label">Net Operating Flow</span>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wallet size={18} />
            </div>
          </div>
          <span
            className="kpi-value"
            style={{ color: totalReceived >= totalPaidOut ? 'var(--primary)' : 'var(--danger)' }}
          >
            {formatCurrency(totalReceived - totalPaidOut)}
          </span>
          <span className="kpi-sub">{paymentsList.length} total transactions</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Receipt size={17} /> Payment & Receipt Transactions
          </h2>
        </div>

        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ minWidth: 260 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search reference, party..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
          >
            <option value="">All Payment Types</option>
            <option value="customer_receipt">Customer Receipt (Inflow)</option>
            <option value="supplier_payment">Supplier Payment (Outflow)</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_payment">Mobile Payment</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading transactions...</p>
          </div>
        ) : paymentsList.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <CreditCard size={36} style={{ color: 'var(--text-secondary)', marginBottom: 8 }} />
            <p>No payment records found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Voucher ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party Name</th>
                  <th>Method</th>
                  <th>Reference / Note</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const isInflow = p.payment_type === 'customer_receipt' || p.payment_type === 'sale_payment';
                  return (
                    <tr key={p.payment_id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.payment_id}</td>
                      <td>{formatDate(p.payment_date || p.created_at)}</td>
                      <td>
                        <span className={clsx('badge', isInflow ? 'badge-green' : 'badge-amber')}>
                          {isInflow ? 'Receipt (In)' : 'Payment (Out)'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.party_name || p.party_id || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.payment_method}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.reference_number || p.reference_note || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isInflow ? 'var(--success)' : 'var(--danger)' }}>
                        {isInflow ? '+' : '-'}{formatCurrency(p.amount)}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setViewPayment(p)}
                          title="View Payment Voucher"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(p)}
                          title="Delete Payment Record"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, paymentsList.length)} of {paymentsList.length}
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

      {/* Record Payment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Payment / Receipt</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Transaction Type *</label>
                  <select
                    className="form-select"
                    value={form.payment_type}
                    onChange={(e) => setForm({ ...form, payment_type: e.target.value, party_id: '' })}
                  >
                    <option value="customer_receipt">Customer Receipt (Money In)</option>
                    <option value="supplier_payment">Supplier Payment (Money Out)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {form.payment_type === 'customer_receipt' ? 'Customer *' : 'Supplier *'}
                  </label>
                  <select
                    className="form-select"
                    value={form.party_id}
                    onChange={(e) => setForm({ ...form, party_id: e.target.value })}
                    required
                  >
                    <option value="">Select {form.payment_type === 'customer_receipt' ? 'Customer' : 'Supplier'}...</option>
                    {form.payment_type === 'customer_receipt'
                      ? customerList.map((c) => (
                          <option key={c.customer_id} value={c.customer_id}>
                            {c.name} {Number(c.outstanding_balance) > 0 ? `(Owes: ${formatCurrency(c.outstanding_balance)})` : ''}
                          </option>
                        ))
                      : supplierList.map((s) => (
                          <option key={s.supplier_id} value={s.supplier_id}>
                            {s.name} {Number(s.outstanding_balance) > 0 ? `(Payable: ${formatCurrency(s.outstanding_balance)})` : ''}
                          </option>
                        ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Payment Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.payment_date}
                      onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method *</label>
                    <select
                      className="form-select"
                      value={form.payment_method}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_payment">Mobile Payment</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Note</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Slip #, Cheque #, or context..."
                    value={form.reference_number}
                    onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View / Print Voucher Modal */}
      {viewPayment && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Payment Voucher</h3>
              <button className="btn-close" onClick={() => setViewPayment(null)}>&times;</button>
            </div>
            <div className="modal-body" id="printable-voucher">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={logoImg} alt="4N Planet" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 6px' }} />
                <h4 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--navy-dark)' }}>4N Planet</h4>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Mobile Phones & Accessories</p>
                <span className={clsx('badge', viewPayment.payment_type?.includes('receipt') ? 'badge-green' : 'badge-amber')} style={{ marginTop: 6 }}>
                  {viewPayment.payment_type?.includes('receipt') ? 'Receipt Voucher (Cash In)' : 'Payment Voucher (Cash Out)'}
                </span>
              </div>

              <div style={{ background: 'var(--neutral-surface)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Voucher ID:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{viewPayment.payment_id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                  <span>{formatDate(viewPayment.payment_date || viewPayment.created_at)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Party Name:</span>
                  <strong>{viewPayment.party_name || viewPayment.party_id || '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
                  <span style={{ textTransform: 'capitalize' }}>{viewPayment.payment_method}</span>
                </div>
                {viewPayment.reference_number && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Reference:</span>
                    <span>{viewPayment.reference_number}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Total Amount:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: viewPayment.payment_type?.includes('receipt') ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(viewPayment.amount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewPayment(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={15} /> Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Payment</h3>
              <button className="btn-close" onClick={() => setDeleteTarget(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete payment <strong>{deleteTarget.payment_id}</strong>?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                Party: <strong>{deleteTarget.party_name || deleteTarget.party_id}</strong> · Amount: <strong>{formatCurrency(deleteTarget.amount)}</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeletePayment} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
