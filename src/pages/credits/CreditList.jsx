// src/pages/credits/CreditList.jsx
// Dedicated Credit Management (Total Credit, Customer Credit Balances, Invoices, Settlements)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CreditCard, Clock, Search, DollarSign,
  CheckCircle2, Phone, Receipt, Eye, RefreshCw
} from 'lucide-react';
import { customers as customersApi, sales as salesApi, payments as paymentsApi } from '../../services/api.js';
import { formatCurrency, formatDate, initials } from '../../utils/format.js';
import toast from 'react-hot-toast';

export default function CreditList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'invoices'
  const [loading, setLoading] = useState(true);
  const [customerList, setCustomerList] = useState([]);
  const [creditSales, setCreditSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Payment Settlement Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null); // customer or sale
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, salesRes] = await Promise.all([
        customersApi.list(),
        salesApi.list({ limit: '200' }),
      ]);

      const allCustomers = custRes.data.data.customers || [];
      const allSales = salesRes.data.data.sales || [];

      // Customers with credit due
      setCustomerList(allCustomers);

      // Invoices with outstanding balance
      const dueSales = allSales.filter(
        (s) => Number(s.outstanding_balance) > 0 || s.payment_status === 'partial' || s.payment_status === 'unpaid'
      );
      setCreditSales(dueSales);
    } catch {
      toast.error('Failed to load credit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter customers with outstanding balance > 0
  const customersWithCredit = customerList.filter(
    (c) => Number(c.outstanding_balance) > 0
  );

  const filteredCustomers = customersWithCredit.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term)
    );
  });

  const filteredSales = creditSales.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.invoice_number?.toLowerCase().includes(term) ||
      s.customer_name?.toLowerCase().includes(term)
    );
  });

  // KPI Calculations
  const totalOutstanding = customersWithCredit.reduce(
    (sum, c) => sum + Number(c.outstanding_balance || 0),
    0
  );
  const totalCreditInvoicesSum = creditSales.reduce(
    (sum, s) => sum + Number(s.outstanding_balance || 0),
    0
  );
  const activeCreditCustomersCount = customersWithCredit.length;

  // Open Payment Modal for Customer
  const handleOpenCustomerPay = (cust) => {
    setSelectedTarget({
      type: 'customer',
      id: cust.customer_id,
      name: cust.name,
      phone: cust.phone,
      balance: Number(cust.outstanding_balance || 0),
    });
    setPayAmount(String(cust.outstanding_balance || ''));
    setPayMethod('cash');
    setPayReference('');
    setPayNotes(`Settlement for customer credit: ${cust.name}`);
    setPaymentModalOpen(true);
  };

  // Open Payment Modal for Specific Sale Invoice
  const handleOpenSalePay = (sale) => {
    setSelectedTarget({
      type: 'sale',
      id: sale.sale_id,
      invoiceNumber: sale.invoice_number,
      customerId: sale.customer_id,
      name: sale.customer_name,
      balance: Number(sale.outstanding_balance || 0),
    });
    setPayAmount(String(sale.outstanding_balance || ''));
    setPayMethod('cash');
    setPayReference('');
    setPayNotes(`Invoice payment: ${sale.invoice_number}`);
    setPaymentModalOpen(true);
  };

  // Submit Payment Settlement
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (amountNum > selectedTarget.balance) {
      toast.error(`Amount exceeds outstanding balance (${formatCurrency(selectedTarget.balance)})`);
      return;
    }

    setSubmittingPay(true);
    try {
      const paymentData = {
        payment_type: 'customer_receipt',
        related_id: selectedTarget.type === 'sale' ? selectedTarget.id : (creditSales.find(s => s.customer_id === selectedTarget.id)?.sale_id || 'CREDIT-SETTLE'),
        party_id: selectedTarget.type === 'customer' ? selectedTarget.id : (selectedTarget.customerId || 'WALK_IN'),
        amount: amountNum,
        payment_method: payMethod,
        reference_number: payReference,
        payment_date: new Date().toISOString(),
        notes: payNotes,
        idempotency_key: `PAY-SETTLE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };

      await paymentsApi.create(paymentData);
      toast.success(`Successfully recorded payment of ${formatCurrency(amountNum)}!`);
      setPaymentModalOpen(false);
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record payment';
      toast.error(msg);
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={26} color="var(--primary)" />
            Customer Credit & Receivables
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: '4px 0 0' }}>
            Track total customer dues, view outstanding credit balances, and collect payments
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/pos')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Receipt size={14} /> Open POS
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 28 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Outstanding Credit
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEE2E2', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--navy-dark)' }}>
            {formatCurrency(totalOutstanding || totalCreditInvoicesSum)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, fontWeight: 600 }}>
            Receivable across all customers
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Customers with Balance
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--navy-dark)' }}>
            {activeCreditCustomersCount}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Active debtors on credit terms
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Credit Invoices Due
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FEF3C7', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--navy-dark)' }}>
            {creditSales.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Unpaid or partially paid sales
          </div>
        </div>
      </div>

      {/* Main Content Area: Tabs & Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Navigation Tabs & Search Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          background: '#FFFFFF',
        }}>
          {/* Segmented Tab Switch */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--neutral-surface)', padding: 4, borderRadius: 'var(--radius-md)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'customers' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'customers' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'customers' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: activeTab === 'customers' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Users size={15} />
              <span>Customer Balances ({customersWithCredit.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: activeTab === 'invoices' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'invoices' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'invoices' ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: activeTab === 'invoices' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Receipt size={15} />
              <span>Credit Invoices ({creditSales.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              className="form-input"
              style={{ paddingLeft: 32, height: 36, fontSize: 12.5 }}
              placeholder={activeTab === 'customers' ? 'Search customer or phone...' : 'Search invoice or customer...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tab 1: Customer Balances Table */}
        {activeTab === 'customers' && (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile Phone</th>
                  <th>Total Purchases</th>
                  <th>Total Paid</th>
                  <th style={{ textAlign: 'right' }}>Credit Outstanding</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Loading customer credit balances...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 48 }}>
                      <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy-dark)' }}>No Outstanding Customer Credit</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        All customer accounts are clear with zero pending balances.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const balance = Number(c.outstanding_balance) || 0;
                    return (
                      <tr key={c.customer_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                              {initials(c.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--navy-dark)', fontSize: 13.5 }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {c.customer_id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {c.phone ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)' }}>
                              <Phone size={13} color="var(--primary)" /> {c.phone}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>
                          {formatCurrency(c.total_purchases || 0)}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                          {formatCurrency(c.total_payments || 0)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            background: '#FEE2E2',
                            color: 'var(--danger)',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 800,
                            fontSize: 14,
                          }}>
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenCustomerPay(c)}
                              style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                              <CreditCard size={13} /> Collect Payment
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => navigate(`/customers/${c.customer_id}`)}
                              title="View Customer Profile & Ledger"
                              style={{ fontSize: 12, padding: '4px 8px' }}
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Credit Invoices Table */}
        {activeTab === 'invoices' && (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Invoice Total</th>
                  <th>Amount Paid</th>
                  <th style={{ textAlign: 'right' }}>Balance Due</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Loading credit invoices...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 48 }}>
                      <CheckCircle2 size={36} color="var(--success)" style={{ margin: '0 auto 10px' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy-dark)' }}>No Pending Credit Invoices</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        All sales orders have been paid in full.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.sale_id}>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: 13.5 }}>
                          {sale.invoice_number}
                        </strong>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {formatDate(sale.sale_date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy-dark)', fontSize: 13 }}>
                          {sale.customer_name || 'Walk-in Customer'}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 700 }}>
                        {formatCurrency(sale.grand_total)}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                        {formatCurrency(sale.amount_paid)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          background: '#FEE2E2',
                          color: 'var(--danger)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 800,
                          fontSize: 13,
                        }}>
                          {formatCurrency(sale.outstanding_balance)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${sale.payment_status === 'partial' ? 'badge-yellow' : 'badge-red'}`} style={{ fontSize: 11 }}>
                          {sale.payment_status === 'partial' ? 'Partial' : 'Unpaid Credit'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenSalePay(sale)}
                            style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <CreditCard size={13} /> Settle
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/sales/${sale.sale_id}`)}
                            title="View Invoice Details"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Collect Payment Modal ── */}
      {paymentModalOpen && selectedTarget && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={20} color="var(--primary)" />
                Collect Credit Payment
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setPaymentModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'var(--neutral-surface)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              border: '1px solid var(--border-color)',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Target</span>
                <strong style={{ fontSize: 13, color: 'var(--navy-dark)' }}>
                  {selectedTarget.name} {selectedTarget.invoiceNumber ? `(${selectedTarget.invoiceNumber})` : ''}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Outstanding Balance</span>
                <strong style={{ fontSize: 15, color: 'var(--danger)' }}>
                  {formatCurrency(selectedTarget.balance)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Payment Amount (LKR) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={selectedTarget.balance}
                    className="form-input"
                    style={{ fontSize: 16, fontWeight: 700, paddingRight: 60 }}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(selectedTarget.balance))}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Full
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Payment Method *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'card', label: 'Card' },
                    { id: 'bank_transfer', label: 'Bank Transfer' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${payMethod === m.id ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: payMethod === m.id ? 'var(--primary-light)' : '#FFF',
                        color: payMethod === m.id ? 'var(--primary)' : 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Reference / Receipt #</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Optional bank ref, cheque # or receipt number"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={submittingPay}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingPay || !payAmount || Number(payAmount) <= 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={15} />
                  {submittingPay ? 'Recording...' : `Confirm Payment of ${formatCurrency(payAmount || 0)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

