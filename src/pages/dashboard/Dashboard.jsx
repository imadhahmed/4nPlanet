// src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle, XCircle,
  DollarSign, Users, Truck, Wallet, Wrench, PlusCircle,
  ShoppingBag, RefreshCw, Shield, ArrowRight, Calendar,
  CreditCard, Award, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { dashboard } from '../../services/api.js';
import { formatCurrency, formatDate, paymentStatusBadge } from '../../utils/format.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

// Curated restrained palette matching theme
const PALETTE = ['#3157D5', '#23966A', '#D69A28', '#6366F1', '#0284C7', '#D94B4B', '#8B5CF6'];

function StatCard({ icon: Icon, iconClass, label, value, sub, trend, onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`stat-icon ${iconClass}`}>
        <Icon size={20} />
      </div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      {trend && (
        <span className={`stat-trend ${trend > 0 ? 'positive' : 'negative'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
      <div className="stat-info" style={{ width: '100%' }}>
        <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 22, width: '80%' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartRange, setChartRange] = useState('7d'); // '7d' | '30d'

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await dashboard.get();
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const { summary, charts, recent } = data || {};

  const colomboTodayFormatted = new Date().toLocaleDateString('en-LK', {
    timeZone: 'Asia/Colombo',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="skeleton" style={{ height: 26, width: 180, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: 320 }} />
          </div>
        </div>
        <div className="stat-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="stat-grid">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i + 4} />)}
        </div>
      </div>
    );
  }

  // Chart data calculation
  const allDays = charts?.salesByDay || [];
  const chartDays = chartRange === '7d' ? allDays.slice(-7) : allDays;

  // Pie chart data
  const categoryData = charts?.salesByCategory?.slice(0, 5) || [];
  const paymentData = charts?.paymentMethodChart?.slice(0, 5) || [];
  const activePieData = paymentData.length > 0 ? paymentData : categoryData;

  return (
    <div>
      {/* ── Top Dashboard Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name || 'Admin'}</strong>! Here is today's sales and inventory overview.
          </p>
        </div>
        <div className="page-actions">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: '#FFFFFF',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
            fontSize: 12.5, color: 'var(--text-secondary)',
          }}>
            <Calendar size={14} style={{ color: 'var(--primary)' }} />
            <span>{colomboTodayFormatted}</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh dashboard data"
          >
            <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
            <span>Refresh</span>
          </button>

          <button className="btn btn-primary btn-sm" onClick={() => navigate('/pos')}>
            <PlusCircle size={15} />
            <span>New Sale</span>
          </button>
        </div>
      </div>

      {/* ── Summary Cards: Row 1 (4 per row on large screen) ── */}
      <div className="stat-grid">
        <StatCard
          icon={TrendingUp}
          iconClass="blue"
          label="Today's Sales"
          value={formatCurrency(summary?.todayRevenue || 0)}
          sub={`${summary?.todaySalesCount || 0} sales recorded today`}
          onClick={() => navigate('/sales')}
        />
        <StatCard
          icon={DollarSign}
          iconClass="green"
          label="Gross Profit"
          value={formatCurrency(summary?.todayGrossProfit || 0)}
          sub={`Net: ${formatCurrency(summary?.todayNetProfit || 0)}`}
        />
        <StatCard
          icon={Package}
          iconClass="navy"
          label="Products in Stock"
          value={summary?.totalProducts || 0}
          sub={`${formatNumber(summary?.totalAvailableUnits || 0)} total units available`}
          onClick={() => navigate('/products')}
        />
        <StatCard
          icon={AlertTriangle}
          iconClass={(summary?.lowStock || 0) + (summary?.outOfStock || 0) > 0 ? 'amber' : 'green'}
          label="Low-Stock Products"
          value={(summary?.lowStock || 0) + (summary?.outOfStock || 0)}
          sub={`${summary?.outOfStock || 0} out of stock`}
          onClick={() => navigate('/products?low_stock=true')}
        />
      </div>

      {/* ── Summary Cards: Row 2 (Secondary Metrics) ── */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard
          icon={Wrench}
          iconClass="cyan"
          label="Pending Repairs"
          value={summary?.pendingRepairs || 0}
          sub="Active repair workshop jobs"
          onClick={() => navigate('/repairs')}
        />
        <StatCard
          icon={Users}
          iconClass="amber"
          label="Outstanding Receivables"
          value={formatCurrency(summary?.customerOutstanding || 0)}
          sub="Due from credit customers"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          icon={Wallet}
          iconClass="purple"
          label="Inventory Cost Value"
          value={formatCurrency(summary?.totalCostValue || 0)}
          sub={`Retail: ${formatCurrency(summary?.totalRetailValue || 0)}`}
          onClick={() => navigate('/products')}
        />
        <StatCard
          icon={CreditCard}
          iconClass="navy"
          label="Today's Expenses"
          value={formatCurrency(summary?.todayExpenses || 0)}
          sub="Recorded operational costs"
          onClick={() => navigate('/expenses')}
        />
      </div>

      {/* ── Analytics Section: Responsive Two-Column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20, marginBottom: 24 }}>
        {/* Left Column: Sales Trend & Recent Sales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sales Revenue Trend Chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                  Sales Overview
                </h3>
                <div className="card-subtitle">Revenue trajectory over time</div>
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--neutral-surface)', padding: 3, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <button
                  className={`btn btn-sm ${chartRange === '7d' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 10px', fontSize: 11.5 }}
                  onClick={() => setChartRange('7d')}
                >
                  7 Days
                </button>
                <button
                  className={`btn btn-sm ${chartRange === '30d' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '3px 10px', fontSize: 11.5 }}
                  onClick={() => setChartRange('30d')}
                >
                  30 Days
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px 20px 20px' }}>
              {chartDays.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3157D5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3157D5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E9F0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const dateObj = new Date(d);
                        return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('en-LK', { month: 'short', day: 'numeric', timeZone: 'Asia/Colombo' });
                      }}
                      tick={{ fontSize: 11, fill: '#7A8597' }}
                      axisLine={{ stroke: '#E5E9F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                      tick={{ fontSize: 11, fill: '#7A8597' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [formatCurrency(v), 'Revenue']}
                      labelFormatter={(d) => formatDate(d)}
                      contentStyle={{
                        fontSize: 12, borderRadius: 8, border: '1px solid #E5E9F0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)', background: '#FFFFFF',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3157D5"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <p>No sales records found for this period</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <ShoppingCart size={16} style={{ color: 'var(--primary)' }} />
                  Recent Sales
                </h3>
                <div className="card-subtitle">Latest processed customer orders</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sales')}>
                <span>View all</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date / Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent?.recentSales?.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                        No sales recorded yet
                      </td>
                    </tr>
                  ) : (
                    recent?.recentSales?.map((sale) => (
                      <tr key={sale.sale_id}>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {sale.invoice_number}
                        </td>
                        <td>{sale.customer_name || 'Walk-in Customer'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {formatDate(sale.sale_date || sale.created_at)}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>
                          {formatCurrency(sale.grand_total)}
                        </td>
                        <td>
                          <span className={`badge ${paymentStatusBadge(sale.payment_status)}`}>
                            {sale.payment_status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate(`/sales/${sale.sale_id}`)}
                            title="View sale details"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top-Selling Products */}
          {charts?.bestSellers?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <Award size={16} style={{ color: 'var(--warning)' }} />
                    Top-Selling Products
                  </h3>
                  <div className="card-subtitle">Fastest moving items in store</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>
                  <span>Inventory</span>
                  <ArrowRight size={13} />
                </button>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Units Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charts.bestSellers.slice(0, 5).map((item) => (
                      <tr key={item.product_id}>
                        <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                          {item.name}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          <span className="badge badge-blue">{item.quantity}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy-dark)' }}>
                          {formatCurrency(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Doughnut Chart, Low Stock Alerts, Expiry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Sales Distribution Chart */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Sales by Category</h3>
                <div className="card-subtitle">Revenue distribution by product line</div>
              </div>
            </div>
            <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {activePieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={activePieData}
                        dataKey={activePieData === paymentData ? 'value' : 'revenue'}
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {activePieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend list */}
                  <div style={{ width: '100%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activePieData.map((entry, idx) => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: PALETTE[idx % PALETTE.length] }} />
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                          {formatCurrency(entry.value || entry.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: 30 }}>
                  <p>No category breakdown available</p>
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ color: 'var(--warning)' }}>
                  <AlertTriangle size={16} />
                  Low-Stock Alerts
                </h3>
                <div className="card-subtitle">Items at or below reorder threshold</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products?low_stock=true')}>
                <span>View all</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <div>
              {recent?.lowStockAlerts?.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <p style={{ color: 'var(--success)', fontWeight: 500 }}>All inventory levels are healthy</p>
                </div>
              ) : (
                recent?.lowStockAlerts?.slice(0, 5).map((p) => (
                  <div
                    key={p.product_id}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '12px 18px', borderBottom: '1px solid var(--border-color)',
                      gap: 12, cursor: 'pointer', transition: 'background 0.15s ease',
                    }}
                    onClick={() => navigate(`/products/${p.product_id}`)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-dark)' }} className="truncate">
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {p.brand_name || 'Generic'} · min: {p.min_stock_level}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${p.current_stock === 0 ? 'badge-red' : 'badge-amber'}`}>
                        {p.current_stock} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Warranty Expiry Reminders */}
          {recent?.expiringWarranties?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    <Shield size={16} style={{ color: 'var(--info)' }} />
                    Expiring Warranties
                  </h3>
                  <div className="card-subtitle">Customer warranties ending within 30 days</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/warranties')}>
                  <span>View all</span>
                  <ArrowRight size={13} />
                </button>
              </div>
              <div>
                {recent.expiringWarranties.slice(0, 4).map((w) => (
                  <div
                    key={w.warranty_id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 18px', borderBottom: '1px solid var(--border-color)',
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--navy-dark)' }} className="truncate">
                        {w.product_name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {w.customer_name} · #{w.invoice_number}
                      </div>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: 11 }}>
                      {formatDate(w.warranty_expiry)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatNumber(n) {
  return new Intl.NumberFormat('en-LK').format(n);
}
