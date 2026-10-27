// src/pages/reports/Reports.jsx
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  FileText, TrendingUp, DollarSign, ShoppingCart,
  Calendar, Printer, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { reports as reportsApi } from '../../services/api.js';
import { formatCurrency, formatDate, todayISO } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function Reports() {
  const [reportType, setReportType] = useState('sales');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(todayISO());

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = () => {
    setLoading(true);
    reportsApi.get(reportType, { from, to })
      .then((res) => {
        setData(res.data.data);
      })
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, from, to]);

  const setPreset = (preset) => {
    const now = new Date();
    const end = todayISO();
    let start = todayISO();

    if (preset === 'today') {
      start = todayISO();
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString().split('T')[0];
    }

    setFrom(start);
    setTo(end);
  };

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Financial & Analytics Reports</h1>
          <p className="page-subtitle">Analyze retail turnover, net profit margins, purchases, and expense distribution</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print Report
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>To:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('today')}>Today</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('week')}>Last 7 Days</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('month')}>Last 30 Days</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreset('year')}>This Year</button>
          </div>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={clsx('tab-btn', reportType === 'sales' && 'active')}
          onClick={() => setReportType('sales')}
        >
          <TrendingUp size={16} /> Sales & Turnover
        </button>
        <button
          className={clsx('tab-btn', reportType === 'profit' && 'active')}
          onClick={() => setReportType('profit')}
        >
          <DollarSign size={16} /> Profit & Loss
        </button>
        <button
          className={clsx('tab-btn', reportType === 'purchases' && 'active')}
          onClick={() => setReportType('purchases')}
        >
          <ShoppingCart size={16} /> Supplier Purchases
        </button>
        <button
          className={clsx('tab-btn', reportType === 'expenses' && 'active')}
          onClick={() => setReportType('expenses')}
        >
          <FileText size={16} /> Expense Analysis
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
          <p>Generating analytics report...</p>
        </div>
      ) : !data ? null : (
        <>
          {/* Sales Report */}
          {reportType === 'sales' && (
            <div>
              <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Total Sales Revenue</span>
                  <span className="kpi-value">{formatCurrency(data.totalRevenue || 0)}</span>
                  <span className="kpi-sub">{data.count || 0} completed invoices</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Gross Profit</span>
                  <span className="kpi-value" style={{ color: 'var(--success-600)' }}>
                    {formatCurrency(data.grossProfit || 0)}
                  </span>
                  <span className="kpi-sub">
                    Margin: {data.totalRevenue > 0 ? (((data.grossProfit || 0) / data.totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Total Discounts Given</span>
                  <span className="kpi-value">{formatCurrency(data.totalDiscount || 0)}</span>
                  <span className="kpi-sub">Customer price concessions</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Customer Receivables</span>
                  <span className={clsx('kpi-value', data.totalOutstanding > 0 ? 'text-danger' : '')}>
                    {formatCurrency(data.totalOutstanding || 0)}
                  </span>
                  <span className="kpi-sub">Unpaid balances</span>
                </div>
              </div>

              {/* Sales Ledger Table */}
              <div className="card">
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Sales Ledger</h2>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th style={{ textAlign: 'right' }}>Grand Total</th>
                        <th style={{ textAlign: 'right' }}>Amount Paid</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.sales || []).map((s) => (
                        <tr key={s.sale_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.invoice_number}</td>
                          <td>{formatDate(s.sale_date || s.created_at)}</td>
                          <td>{s.customer_name || 'Walk-in'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.grand_total)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success-600)' }}>{formatCurrency(s.amount_paid)}</td>
                          <td style={{ textAlign: 'right', color: Number(s.outstanding_balance) > 0 ? 'var(--danger-600)' : 'inherit' }}>
                            {formatCurrency(s.outstanding_balance || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Profit & Loss Report */}
          {reportType === 'profit' && (
            <div>
              <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Gross Sales Turnover</span>
                  <span className="kpi-value">{formatCurrency(data.revenue || 0)}</span>
                  <span className="kpi-sub">Retail phone & accessory sales</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Cost of Goods Sold (COGS)</span>
                  <span className="kpi-value">{formatCurrency(data.cogs || 0)}</span>
                  <span className="kpi-sub">Stock purchase acquisition cost</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Operating Expenses</span>
                  <span className="kpi-value" style={{ color: 'var(--danger-600)' }}>
                    {formatCurrency(data.expensesTotal || 0)}
                  </span>
                  <span className="kpi-sub">Rent, bills, staff, utilities</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Net Operating Profit</span>
                  <span
                    className="kpi-value"
                    style={{ color: (data.netProfit || 0) >= 0 ? 'var(--success-600)' : 'var(--danger-600)' }}
                  >
                    {formatCurrency(data.netProfit || 0)}
                  </span>
                  <span className="kpi-sub">After all expenses</span>
                </div>
              </div>

              {/* Profit Breakdown Card */}
              <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Statement of Profit & Loss</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                    <span>(+) Gross Sales Turnover</span>
                    <strong style={{ color: 'var(--blue-400)' }}>{formatCurrency(data.revenue || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                    <span>(-) Cost of Goods Sold</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>-{formatCurrency(data.cogs || 0)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTop: '1px solid var(--gray-200)',
                      fontWeight: 600,
                    }}
                  >
                    <span>(=) Gross Profit</span>
                    <span style={{ color: 'var(--success-600)' }}>{formatCurrency(data.grossProfit || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                    <span>(-) Total Operating Expenses</span>
                    <strong style={{ color: 'var(--danger-600)' }}>-{formatCurrency(data.expensesTotal || 0)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 12,
                      borderTop: '2px dashed var(--gray-300)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: (data.netProfit || 0) >= 0 ? 'var(--success-600)' : 'var(--danger-600)',
                    }}
                  >
                    <span>(=) Net Profit</span>
                    <span>{formatCurrency(data.netProfit || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Purchases Report */}
          {reportType === 'purchases' && (
            <div>
              <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Total Stock Purchased</span>
                  <span className="kpi-value">{formatCurrency(data.total || 0)}</span>
                  <span className="kpi-sub">{data.count || 0} purchase orders</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Total Supplier Payments</span>
                  <span className="kpi-value" style={{ color: 'var(--success-600)' }}>
                    {formatCurrency(data.paid || 0)}
                  </span>
                  <span className="kpi-sub">Disbursed cash & bank settlements</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Supplier Payables (Outstanding)</span>
                  <span className={clsx('kpi-value', data.outstanding > 0 ? 'text-danger' : '')}>
                    {formatCurrency(data.outstanding || 0)}
                  </span>
                  <span className="kpi-sub">Remaining credit obligations</span>
                </div>
              </div>

              <div className="card">
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Purchase Orders List</h2>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>PO #</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th style={{ textAlign: 'right' }}>Total Cost</th>
                        <th style={{ textAlign: 'right' }}>Amount Paid</th>
                        <th style={{ textAlign: 'right' }}>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.purchases || []).map((p) => (
                        <tr key={p.purchase_id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.purchase_number}</td>
                          <td>{formatDate(p.purchase_date || p.created_at)}</td>
                          <td>{p.supplier_name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.total_cost)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success-600)' }}>{formatCurrency(p.amount_paid)}</td>
                          <td style={{ textAlign: 'right', color: Number(p.outstanding_balance) > 0 ? 'var(--danger-600)' : 'inherit' }}>
                            {formatCurrency(p.outstanding_balance || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Expenses Report */}
          {reportType === 'expenses' && (
            <div>
              <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi-card">
                  <span className="kpi-label">Total Operational Overheads</span>
                  <span className="kpi-value" style={{ color: 'var(--danger-600)' }}>
                    {formatCurrency(data.total || 0)}
                  </span>
                  <span className="kpi-sub">{data.count || 0} expense vouchers</span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="card">
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Expenses by Category</h2>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                        <th style={{ textAlign: 'right' }}>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.byCategory || {}).map(([cat, amt]) => (
                        <tr key={cat}>
                          <td style={{ fontWeight: 600 }}>{cat}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger-600)' }}>
                            {formatCurrency(amt)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {data.total > 0 ? `${((amt / data.total) * 100).toFixed(1)}%` : '0%'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
