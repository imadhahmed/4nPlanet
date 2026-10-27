// src/pages/payments/Payments.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, CreditCard, ArrowDownRight, ArrowUpRight, Filter, Calendar } from 'lucide-react';
import { payments as paymentsApi, customers as customersApi, suppliers as suppliersApi } from '../../services/api.js';
import { formatCurrency, formatDate, todayISO } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
        <div>
          <h1 className="page-title">Payments & Receipts</h1>
          <p className="page-subtitle">Track customer payments, supplier settlements, and cash movement</p>
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
          <span className="kpi-label">Total Cash Inflow (Receipts)</span>
          <span className="kpi-value" style={{ color: 'var(--success-600)' }}>
            {formatCurrency(totalReceived)}
          </span>
          <span className="kpi-sub">Customer accounts & retail sales</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Outflow (Payables)</span>
          <span className="kpi-value" style={{ color: 'var(--danger-600)' }}>
            {formatCurrency(totalPaidOut)}
          </span>
          <span className="kpi-sub">Supplier settlements</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Net Operating Flow</span>
          <span className="kpi-value" style={{ color: totalReceived >= totalPaidOut ? 'var(--blue-400)' : 'var(--danger-600)' }}>
            {formatCurrency(totalReceived - totalPaidOut)}
          </span>
          <span className="kpi-sub">{paymentsList.length} transactions</span>
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
          <div className="empty-state">
            <CreditCard size={36} />
            <p>No payment records found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Party / Customer / Supplier</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const isInflow = p.payment_type === 'customer_receipt' || p.payment_type === 'sale_payment';
                  return (
                    <tr key={p.payment_id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.payment_id}</td>
                      <td>{formatDate(p.payment_date || p.created_at)}</td>
                      <td>
                        <span className={clsx('badge', isInflow ? 'badge-green' : 'badge-amber')}>
                          {isInflow ? 'Receipt (In)' : 'Payment (Out)'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{p.party_name || p.party_id || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.payment_method}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{p.reference_number || p.reference_note || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isInflow ? 'var(--success-600)' : 'var(--danger-600)' }}>
                        {isInflow ? '+' : '-'}{formatCurrency(p.amount)}
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
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
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
          <div className="modal-content" style={{ maxWidth: 480 }}>
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

                <div className="form-group">
                  <label className="form-label">Reference / Note</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Slip #, Cheque #, or note..."
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
    </div>
  );
}
