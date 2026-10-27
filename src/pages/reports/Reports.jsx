// src/pages/reports/Reports.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  FileText, TrendingUp, DollarSign, ShoppingCart,
  Calendar, Printer, ArrowDownRight, ArrowUpRight, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import { reports as reportsApi } from '../../services/api.js';
import { formatCurrency, formatDate, todayISO } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import logoImg from '../../assets/4N Planet POS System Logo.png';

const COLORS = ['#3157D5', '#23966A', '#D69A28', '#D94B4B', '#6366F1', '#0284C7', '#EC4899', '#8B5CF6'];

export default function Reports() {
  const [reportType, setReportType] = useState('sales');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(todayISO());
  const [activePreset, setActivePreset] = useState('month');

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

  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    const end = todayISO();
    let start = todayISO();

    if (presetKey === 'today') {
      start = todayISO();
    } else if (presetKey === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (presetKey === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (presetKey === 'year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      start = d.toISOString().split('T')[0];
    }

    setFrom(start);
    setTo(end);
  };

  // Process timeline data for Sales AreaChart
  const salesChartData = useMemo(() => {
    if (!data?.sales || !Array.isArray(data.sales)) return [];
    const map = {};
    data.sales.forEach((s) => {
      const dateStr = (s.sale_date || s.created_at || '').substring(0, 10);
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr, revenue: 0, count: 0 };
      }
      map[dateStr].revenue += Number(s.grand_total || 0);
      map[dateStr].count += 1;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [data?.sales]);

  // Process data for Profit & Loss BarChart
  const profitChartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Revenue', amount: Number(data.revenue || 0), fill: '#3157D5' },
      { name: 'COGS', amount: Number(data.cogs || 0), fill: '#7A8597' },
      { name: 'Expenses', amount: Number(data.expensesTotal || data.totalExpenses || 0), fill: '#D94B4B' },
      { name: 'Net Profit', amount: Math.max(0, Number(data.netProfit || 0)), fill: '#23966A' },
    ];
  }, [data]);

  // Process data for Expenses Donut Chart
  const expenseChartData = useMemo(() => {
    if (!data?.byCategory) return [];
    return Object.entries(data.byCategory).map(([category, amount]) => ({
      name: category,
      value: Number(amount || 0),
    }));
  }, [data?.byCategory]);

  return (
    <div>
      {/* Print-Only Header */}
      <div className="print-only" style={{ display: 'none', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logoImg} alt="4N Planet" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--navy-dark)' }}>4N Planet — Financial Report</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Type: {reportType.toUpperCase()} · Period: {from} to {to} · Generated: {new Date().toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logoImg} alt="4N Planet" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div>
            <h1 className="page-title">Financial & Analytics Reports</h1>
            <p className="page-subtitle">Analyze retail turnover, net profit margins, purchases, and expense distribution</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} /> Print Report
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card no-print" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={17} style={{ color: 'var(--primary)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-dark)' }}>From:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '6px 10px' }}
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-dark)' }}>To:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '6px 10px' }}
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={clsx('btn btn-sm', activePreset === 'today' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => applyPreset('today')}
            >
              Today
            </button>
            <button
              className={clsx('btn btn-sm', activePreset === 'week' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => applyPreset('week')}
            >
              Last 7 Days
            </button>
            <button
              className={clsx('btn btn-sm', activePreset === 'month' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => applyPreset('month')}
            >
              Last 30 Days
            </button>
            <button
              className={clsx('btn btn-sm', activePreset === 'year' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => applyPreset('year')}
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="tabs no-print" style={{ marginBottom: 20 }}>
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
                  <span className="kpi-value" style={{ color: 'var(--primary)' }}>
                    {formatCurrency(data.totalRevenue || 0)}
                  </span>
                  <span className="kpi-sub">{data.count || 0} completed invoices</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Gross Profit</span>
                  <span className="kpi-value" style={{ color: 'var(--success)' }}>
                    {formatCurrency(data.grossProfit || 0)}
                  </span>
                  <span className="kpi-sub">
                    Margin: {data.totalRevenue > 0 ? (((data.grossProfit || 0) / data.totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Discounts Given</span>
                  <span className="kpi-value" style={{ color: 'var(--warning)' }}>
                    {formatCurrency(data.totalDiscount || 0)}
                  </span>
                  <span className="kpi-sub">Customer concessions</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Customer Receivables</span>
                  <span className="kpi-value" style={{ color: data.totalOutstanding > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {formatCurrency(data.totalOutstanding || 0)}
                  </span>
                  <span className="kpi-sub">Unpaid balances</span>
                </div>
              </div>

              {/* Visual Sales Trend Chart */}
              {salesChartData.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <div className="card-header">
                    <h3 className="card-title">
                      <BarChart3 size={17} /> Daily Sales Revenue Trend
                    </h3>
                  </div>
                  <div style={{ height: 260, padding: 16 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3157D5" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#3157D5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7A8597' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#7A8597' }} axisLine={false} tickLine={false} tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value), 'Revenue']}
                          contentStyle={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E9F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#3157D5" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Sales Ledger Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Sales Transactions Ledger</h3>
                </div>
                <div className="table-responsive">
                  <table>
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
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{s.invoice_number}</td>
                          <td>{formatDate(s.sale_date || s.created_at)}</td>
                          <td style={{ fontWeight: 500 }}>{s.customer_name || 'Walk-in'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(s.grand_total)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(s.amount_paid)}</td>
                          <td style={{ textAlign: 'right', color: Number(s.outstanding_balance) > 0 ? 'var(--danger)' : 'inherit', fontWeight: Number(s.outstanding_balance) > 0 ? 600 : 400 }}>
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
                  <span className="kpi-label">Cost of Goods (COGS)</span>
                  <span className="kpi-value" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(data.cogs || 0)}
                  </span>
                  <span className="kpi-sub">Stock purchase acquisition cost</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Operating Expenses</span>
                  <span className="kpi-value" style={{ color: 'var(--danger)' }}>
                    {formatCurrency(data.expensesTotal || data.totalExpenses || 0)}
                  </span>
                  <span className="kpi-sub">Rent, bills, staff, utilities</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Net Operating Profit</span>
                  <span
                    className="kpi-value"
                    style={{ color: (data.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {formatCurrency(data.netProfit || 0)}
                  </span>
                  <span className="kpi-sub">After all overhead expenses</span>
                </div>
              </div>

              {/* Visual Breakdown BarChart */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <BarChart3 size={17} /> Financial Overview Comparison
                  </h3>
                </div>
                <div style={{ height: 260, padding: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profitChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#7A8597' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#7A8597' }} axisLine={false} tickLine={false} tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), 'Amount']}
                        contentStyle={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E9F0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                        {profitChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Profit Breakdown Statement */}
              <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
                <div className="card-header">
                  <h3 className="card-title">Statement of Profit & Loss</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>(+) Gross Sales Turnover</span>
                    <strong style={{ color: 'var(--primary)' }}>{formatCurrency(data.revenue || 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>(-) Cost of Goods Sold</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>-{formatCurrency(data.cogs || 0)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 10,
                      borderTop: '1px solid var(--border-color)',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    <span>(=) Gross Profit</span>
                    <span style={{ color: 'var(--success)' }}>{formatCurrency(data.grossProfit || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>(-) Total Operating Expenses</span>
                    <strong style={{ color: 'var(--danger)' }}>-{formatCurrency(data.expensesTotal || data.totalExpenses || 0)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      borderTop: '2px dashed var(--border-color)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: (data.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    <span>(=) Net Operating Profit</span>
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
                  <span className="kpi-value" style={{ color: 'var(--primary)' }}>
                    {formatCurrency(data.total || 0)}
                  </span>
                  <span className="kpi-sub">{data.count || 0} purchase orders</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Supplier Payments</span>
                  <span className="kpi-value" style={{ color: 'var(--success)' }}>
                    {formatCurrency(data.paid || 0)}
                  </span>
                  <span className="kpi-sub">Disbursed settlements</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Supplier Payables</span>
                  <span className="kpi-value" style={{ color: data.outstanding > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {formatCurrency(data.outstanding || 0)}
                  </span>
                  <span className="kpi-sub">Remaining credit obligations</span>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Purchase Orders & GRN List</h3>
                </div>
                <div className="table-responsive">
                  <table>
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
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.purchase_number}</td>
                          <td>{formatDate(p.purchase_date || p.created_at)}</td>
                          <td style={{ fontWeight: 500 }}>{p.supplier_name || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.total_cost)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(p.amount_paid)}</td>
                          <td style={{ textAlign: 'right', color: Number(p.outstanding_balance) > 0 ? 'var(--danger)' : 'inherit', fontWeight: Number(p.outstanding_balance) > 0 ? 600 : 400 }}>
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
                  <span className="kpi-value" style={{ color: 'var(--danger)' }}>
                    {formatCurrency(data.total || 0)}
                  </span>
                  <span className="kpi-sub">{data.count || 0} expense vouchers</span>
                </div>
              </div>

              {/* Donut Chart & Category Breakdown Table */}
              <div className="grid-2" style={{ gap: 20 }}>
                {expenseChartData.length > 0 && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <PieIcon size={17} /> Expense Distribution
                      </h3>
                    </div>
                    <div style={{ height: 280, padding: 16 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                          >
                            {expenseChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => [formatCurrency(val), 'Amount']}
                            contentStyle={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E9F0' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Expenses by Category</h3>
                  </div>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th style={{ textAlign: 'right' }}>Total Amount</th>
                          <th style={{ textAlign: 'right' }}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(data.byCategory || {}).map(([cat, amt], idx) => {
                          const pct = data.total > 0 ? ((amt / data.total) * 100).toFixed(1) : 0;
                          return (
                            <tr key={cat}>
                              <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[idx % COLORS.length], display: 'inline-block' }} />
                                {cat}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>
                                {formatCurrency(amt)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="badge badge-gray">{pct}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
