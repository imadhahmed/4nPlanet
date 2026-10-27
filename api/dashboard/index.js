// api/dashboard/index.js
// GET /api/dashboard — real-time dashboard metrics from Google Sheets

import { readSheet } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, asyncHandler } from '../lib/response.js';
import { format, subDays, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

const TZ = 'Asia/Colombo';

function toColomboDayString(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString?.split('T')[0] || '';
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
  } catch {
    return isoString?.split('T')[0] || '';
  }
}

export default asyncHandler(async (req, res) => {
  requireAuth(req);

  // Load all needed sheets in parallel
  const [sales, saleItems, purchases, purchaseItems, expenses, products, serials, customers, suppliers, payments, repairs] = await Promise.all([
    readSheet('Sales'),
    readSheet('Sale_Items'),
    readSheet('Purchases'),
    readSheet('Purchase_Items'),
    readSheet('Expenses'),
    readSheet('Products'),
    readSheet('Serials'),
    readSheet('Customers'),
    readSheet('Suppliers'),
    readSheet('Payments'),
    readSheet('Repair_Jobs'),
  ]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });

  // ─────────────────────────────────────────────
  // TODAY'S SALES
  // ─────────────────────────────────────────────
  const todaySales = sales.filter((s) =>
    s.sale_status === 'completed' &&
    toColomboDayString(s.sale_date) === today
  );

  const todayRevenue = todaySales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0);
  const todayPaid = todaySales.reduce((s, sale) => s + Number(sale.amount_paid || 0), 0);

  // Gross profit: revenue - cost of goods sold
  const todaySaleIds = new Set(todaySales.map((s) => s.sale_id));
  const todayItems = saleItems.filter((i) => todaySaleIds.has(i.sale_id));
  const todayGrossProfit = todayItems.reduce((sum, i) => {
    const revenue = Number(i.total_price || 0);
    const cost = Number(i.purchase_cost || 0) * Number(i.quantity || 1);
    return sum + (revenue - cost);
  }, 0);

  // ─────────────────────────────────────────────
  // TODAY'S EXPENSES
  // ─────────────────────────────────────────────
  const todayExpenses = expenses
    .filter((e) => toColomboDayString(e.expense_date) === today)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const todayNetProfit = todayGrossProfit - todayExpenses;

  // ─────────────────────────────────────────────
  // INVENTORY SUMMARY
  // ─────────────────────────────────────────────
  const activeProducts = products.filter((p) => p.is_active !== 'false');

  const inventoryStats = activeProducts.reduce((acc, p) => {
    const isSerialized = p.is_serialized === 'true';
    const qty = isSerialized
      ? serials.filter((s) => s.product_id === p.product_id && s.status === 'available').length
      : Number(p.stock_quantity) || 0;
    const minLevel = Number(p.min_stock_level) || 0;
    const cost = Number(p.purchase_cost) || 0;
    const retail = Number(p.retail_price) || 0;

    acc.totalProducts++;
    acc.totalCostValue += cost * qty;
    acc.totalRetailValue += retail * qty;
    acc.totalAvailableUnits += qty;

    if (qty === 0) acc.outOfStock++;
    else if (qty <= minLevel) acc.lowStock++;

    return acc;
  }, {
    totalProducts: 0,
    totalCostValue: 0,
    totalRetailValue: 0,
    totalAvailableUnits: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  // ─────────────────────────────────────────────
  // OUTSTANDING BALANCES
  // ─────────────────────────────────────────────
  const customerOutstanding = customers.reduce((s, c) => s + Number(c.outstanding_balance || 0), 0);
  const supplierOutstanding = suppliers.reduce((s, sup) => s + Number(sup.outstanding_balance || 0), 0);

  // ─────────────────────────────────────────────
  // SALES CHART DATA (last 30 days)
  // ─────────────────────────────────────────────
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
  });

  const salesByDay = last30Days.map((day) => {
    const daySales = sales.filter(
      (s) => s.sale_status === 'completed' && toColomboDayString(s.sale_date) === day
    );
    return {
      date: day,
      revenue: daySales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0),
      count: daySales.length,
    };
  });

  // ─────────────────────────────────────────────
  // SALES BY CATEGORY
  // ─────────────────────────────────────────────
  const productMap = Object.fromEntries(products.map((p) => [p.product_id, p]));
  const categoryRevenue = {};

  saleItems.forEach((item) => {
    const sale = sales.find((s) => s.sale_id === item.sale_id);
    if (sale?.sale_status !== 'completed') return;
    const product = productMap[item.product_id];
    const cat = product?.category_name || 'Other';
    categoryRevenue[cat] = (categoryRevenue[cat] || 0) + Number(item.total_price || 0);
  });

  const salesByCategory = Object.entries(categoryRevenue)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // ─────────────────────────────────────────────
  // BEST SELLING PRODUCTS
  // ─────────────────────────────────────────────
  const productSales = {};
  saleItems.forEach((item) => {
    const sale = sales.find((s) => s.sale_id === item.sale_id);
    if (sale?.sale_status !== 'completed') return;
    const key = item.product_id;
    if (!productSales[key]) {
      productSales[key] = {
        product_id: key,
        name: item.product_name,
        quantity: 0,
        revenue: 0,
      };
    }
    productSales[key].quantity += Number(item.quantity || 1);
    productSales[key].revenue += Number(item.total_price || 0);
  });

  const bestSellers = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // ─────────────────────────────────────────────
  // MONTHLY REVENUE (last 12 months)
  // ─────────────────────────────────────────────
  const monthlyRevenue = {};
  sales.filter((s) => s.sale_status === 'completed').forEach((s) => {
    const month = (s.sale_date || '').substring(0, 7); // yyyy-MM
    if (!month) return;
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(s.grand_total || 0);
  });

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return format(d, 'yyyy-MM');
  }).map((month) => ({ month, revenue: monthlyRevenue[month] || 0 }));

  // ─────────────────────────────────────────────
  // PAYMENT METHOD DISTRIBUTION
  // ─────────────────────────────────────────────
  const paymentMethodDist = {};
  payments.filter((p) => p.payment_type === 'customer_receipt').forEach((p) => {
    const method = p.payment_method || 'other';
    paymentMethodDist[method] = (paymentMethodDist[method] || 0) + Number(p.amount || 0);
  });
  const paymentMethodChart = Object.entries(paymentMethodDist).map(([name, value]) => ({ name, value }));

  // ─────────────────────────────────────────────
  // RECENT RECORDS
  // ─────────────────────────────────────────────
  const recentSales = sales
    .filter((s) => s.sale_status === 'completed')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const recentPurchases = purchases
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  // ─────────────────────────────────────────────
  // LOW STOCK ALERTS
  // ─────────────────────────────────────────────
  const lowStockAlerts = activeProducts
    .map((p) => {
      const qty = p.is_serialized === 'true'
        ? serials.filter((s) => s.product_id === p.product_id && s.status === 'available').length
        : Number(p.stock_quantity) || 0;
      return { ...p, current_stock: qty };
    })
    .filter((p) => p.current_stock <= Number(p.min_stock_level) && Number(p.min_stock_level) > 0)
    .sort((a, b) => a.current_stock - b.current_stock)
    .slice(0, 10);

  // ─────────────────────────────────────────────
  // WARRANTY EXPIRY REMINDERS (next 30 days)
  // ─────────────────────────────────────────────
  const warranties = await readSheet('Warranties');
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: TZ });
  const expiringWarranties = warranties
    .filter((w) => w.status === 'active' && w.warranty_expiry >= today && w.warranty_expiry <= in30Days)
    .sort((a, b) => a.warranty_expiry.localeCompare(b.warranty_expiry))
    .slice(0, 10);

  return ok(res, {
    summary: {
      todayRevenue,
      todayPaid,
      todayGrossProfit,
      todayExpenses,
      todayNetProfit,
      todaySalesCount: todaySales.length,
      ...inventoryStats,
      customerOutstanding,
      supplierOutstanding,
      pendingRepairs: repairs.filter((r) => !['collected', 'cancelled'].includes(r.status)).length,
    },
    charts: {
      salesByDay,
      salesByCategory,
      bestSellers,
      last12Months,
      paymentMethodChart,
    },
    recent: {
      recentSales,
      recentPurchases,
      lowStockAlerts,
      expiringWarranties,
    },
  });
});
