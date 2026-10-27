// api/reports/index.js
import { readSheet } from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';

export default asyncHandler(async (req, res) => {
  requireAuth(req, 'reports.view');
  const { type, from, to } = req.query || {};

  if (!type) return fail(res, 'Report type required', 400);

  const filterByDate = (arr, dateField) => {
    return arr.filter((r) => {
      const d = (r[dateField] || '').substring(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };

  switch (type) {
    case 'sales': {
      const sales = filterByDate(await readSheet('Sales'), 'sale_date').filter((s) => s.sale_status === 'completed');
      const saleItems = await readSheet('Sale_Items');
      const totalRevenue = sales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0);
      const totalPaid = sales.reduce((s, sale) => s + Number(sale.amount_paid || 0), 0);
      const totalOutstanding = sales.reduce((s, sale) => s + Number(sale.outstanding_balance || 0), 0);
      const totalDiscount = sales.reduce((s, sale) => s + Number(sale.discount_amount || 0), 0);
      const filteredSaleIds = new Set(sales.map((s) => s.sale_id));
      const filteredItems = saleItems.filter((i) => filteredSaleIds.has(i.sale_id));
      const grossProfit = filteredItems.reduce((sum, i) => {
        const rev = Number(i.total_price || 0);
        const cost = Number(i.purchase_cost || 0) * Number(i.quantity || 1);
        return sum + (rev - cost);
      }, 0);
      return ok(res, { sales, totalRevenue, totalPaid, totalOutstanding, totalDiscount, grossProfit, count: sales.length });
    }

    case 'purchases': {
      const purchases = filterByDate(await readSheet('Purchases'), 'purchase_date');
      const total = purchases.reduce((s, p) => s + Number(p.total_cost || 0), 0);
      const paid = purchases.reduce((s, p) => s + Number(p.amount_paid || 0), 0);
      const outstanding = purchases.reduce((s, p) => s + Number(p.outstanding_balance || 0), 0);
      return ok(res, { purchases, total, paid, outstanding, count: purchases.length });
    }

    case 'expenses': {
      const expenses = filterByDate(await readSheet('Expenses'), 'expense_date');
      const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const byCategory = {};
      expenses.forEach((e) => {
        byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0);
      });
      return ok(res, { expenses, total, byCategory, count: expenses.length });
    }

    case 'profit': {
      const sales = filterByDate(await readSheet('Sales'), 'sale_date').filter((s) => s.sale_status === 'completed');
      const saleItems = await readSheet('Sale_Items');
      const expenses = filterByDate(await readSheet('Expenses'), 'expense_date');
      const filteredSaleIds = new Set(sales.map((s) => s.sale_id));
      const filteredItems = saleItems.filter((i) => filteredSaleIds.has(i.sale_id));
      const revenue = sales.reduce((s, sale) => s + Number(sale.grand_total || 0), 0);
      const grossProfit = filteredItems.reduce((sum, i) => {
        return sum + (Number(i.total_price || 0) - Number(i.purchase_cost || 0) * Number(i.quantity || 1));
      }, 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const netProfit = grossProfit - totalExpenses;
      return ok(res, { revenue, grossProfit, totalExpenses, netProfit });
    }

    case 'inventory': {
      const products = await readSheet('Products');
      const serials = await readSheet('Serials');
      const enriched = products.filter((p) => p.is_active !== 'false').map((p) => {
        const availSerials = serials.filter((s) => s.product_id === p.product_id && s.status === 'available');
        const qty = p.is_serialized === 'true' ? availSerials.length : Number(p.stock_quantity) || 0;
        const costValue = qty * Number(p.purchase_cost || 0);
        const retailValue = qty * Number(p.retail_price || 0);
        return { ...p, current_stock: qty, cost_value: costValue, retail_value: retailValue };
      });
      const totalCost = enriched.reduce((s, p) => s + p.cost_value, 0);
      const totalRetail = enriched.reduce((s, p) => s + p.retail_value, 0);
      return ok(res, { products: enriched, totalCost, totalRetail, count: enriched.length });
    }

    case 'customers': {
      const customers = await readSheet('Customers');
      const withBalance = customers.filter((c) => Number(c.outstanding_balance) > 0);
      const totalOutstanding = customers.reduce((s, c) => s + Number(c.outstanding_balance || 0), 0);
      return ok(res, { customers, withBalance, totalOutstanding });
    }

    case 'suppliers': {
      const suppliers = await readSheet('Suppliers');
      const totalOutstanding = suppliers.reduce((s, sup) => s + Number(sup.outstanding_balance || 0), 0);
      return ok(res, { suppliers, totalOutstanding });
    }

    case 'repairs': {
      const repairs = filterByDate(await readSheet('Repair_Jobs'), 'date_received');
      const totalRevenue = repairs.filter((r) => r.status === 'collected').reduce((s, r) => s + Number(r.final_cost || 0), 0);
      const byStatus = {};
      repairs.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      return ok(res, { repairs, totalRevenue, byStatus, count: repairs.length });
    }

    default:
      return fail(res, `Unknown report type: ${type}`, 400);
  }
});
