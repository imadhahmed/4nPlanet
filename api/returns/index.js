// api/returns/index.js
// Handles listing returns, lookup of original invoice, and processing returns & exchanges.

import {
  readSheet, appendRow, updateRow, findOne, generateId
} from '../lib/sheets.js';
import { requireAuth } from '../lib/auth.js';
import { ok, fail, asyncHandler } from '../lib/response.js';
import { validate, ProcessReturnSchema } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';

export default asyncHandler(async (req, res) => {
  const { user } = requireAuth(req);

  // ─────────────────────────────────────────────
  // GET — List returns OR lookup invoice
  // ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const {
      q, return_type, status, from, to,
      sale_id, invoice, action,
      limit = '50', offset = '0',
    } = req.query || {};

    // ── Invoice & Sales Lookup Helper for Cashier ──
    if (action === 'lookup' || action === 'recent_sales' || (invoice && !return_type && !status && !from && !to)) {
      const searchTerm = (invoice || q || '').trim().toLowerCase();
      const productQuery = (req.query.product || '').trim().toLowerCase();

      const allSales = await readSheet('Sales');
      const allSaleItems = await readSheet('Sale_Items');
      const allReturns = await readSheet('Returns');

      let matches = [];

      // If no query is provided, return recent completed sales for sales history selection
      if (!searchTerm && !productQuery) {
        matches = allSales
          .filter((s) => s.sale_status !== 'cancelled')
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          .slice(0, 20);
      } else {
        // Collect sale IDs where sale items match product name, model, SKU, barcode, or ID
        const matchingSaleIdsFromItems = new Set();
        const effectiveProductTerm = productQuery || searchTerm;

        for (const item of allSaleItems) {
          const pName = (item.product_name || '').toLowerCase();
          const pModel = (item.model || '').toLowerCase();
          const pSku = (item.sku || '').toLowerCase();
          const pBarcode = (item.barcode || '').toLowerCase();
          const pid = (item.product_id || '').toLowerCase();

          if (
            effectiveProductTerm &&
            (pName.includes(effectiveProductTerm) ||
              pModel.includes(effectiveProductTerm) ||
              pSku.includes(effectiveProductTerm) ||
              pBarcode.includes(effectiveProductTerm) ||
              pid === effectiveProductTerm)
          ) {
            matchingSaleIdsFromItems.add(item.sale_id);
          }
        }

        matches = allSales.filter((s) => {
          const inv = (s.invoice_number || '').toLowerCase();
          const cname = (s.customer_name || '').toLowerCase();
          const cphone = (s.customer_phone || '').toLowerCase();
          const sid = (s.sale_id || '').toLowerCase();

          const matchesInvoiceOrCustomer =
            searchTerm &&
            (inv === searchTerm ||
              inv.includes(searchTerm) ||
              cname.includes(searchTerm) ||
              cphone.includes(searchTerm) ||
              sid === searchTerm);

          const matchesProductItems = matchingSaleIdsFromItems.has(s.sale_id);

          return matchesInvoiceOrCustomer || matchesProductItems;
        });

        // Priority sort: exact invoice number first, then date
        matches.sort((a, b) => {
          const aExact = searchTerm && (a.invoice_number || '').toLowerCase() === searchTerm;
          const bExact = searchTerm && (b.invoice_number || '').toLowerCase() === searchTerm;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return (b.created_at || '').localeCompare(a.created_at || '');
        });
      }

      // Enrich top matches (limit to 25 for fast response)
      const effectiveProductTerm = productQuery || searchTerm;
      const enrichedResults = matches.slice(0, 25).map((sale) => {
        const saleItems = allSaleItems.filter((i) => i.sale_id === sale.sale_id);
        const saleReturns = allReturns.filter(
          (r) => r.original_sale_id === sale.sale_id || r.sale_id === sale.sale_id
        );

        // Calculate return eligibility for each item and flag matched products
        const itemsWithEligibility = saleItems.map((item) => {
          const itemReturns = saleReturns.filter(
            (r) => r.product_id === item.product_id || (r.item_id && r.item_id === item.item_id)
          );
          const alreadyReturnedQty = itemReturns.reduce(
            (sum, r) => sum + (Number(r.quantity) || 0),
            0
          );
          const eligibleQty = Math.max(0, (Number(item.quantity) || 1) - alreadyReturnedQty);

          const pName = (item.product_name || '').toLowerCase();
          const pModel = (item.model || '').toLowerCase();
          const pSku = (item.sku || '').toLowerCase();
          const pBarcode = (item.barcode || '').toLowerCase();
          const pid = (item.product_id || '').toLowerCase();
          const isMatched = effectiveProductTerm
            ? pName.includes(effectiveProductTerm) ||
              pModel.includes(effectiveProductTerm) ||
              pSku.includes(effectiveProductTerm) ||
              pBarcode.includes(effectiveProductTerm) ||
              pid === effectiveProductTerm
            : false;

          return {
            ...item,
            already_returned_qty: alreadyReturnedQty,
            eligible_quantity: eligibleQty,
            is_fully_returned: eligibleQty === 0,
            is_matched_product: isMatched,
          };
        });

        const isCancelled = sale.sale_status === 'cancelled';
        const hasEligibleItems = itemsWithEligibility.some((i) => i.eligible_quantity > 0);

        return {
          sale,
          items: itemsWithEligibility,
          returns: saleReturns,
          can_return: !isCancelled && hasEligibleItems,
        };
      });

      return ok(res, { results: enrichedResults });
    }

    // ── Standard List of Return Records ──
    const allReturns = await readSheet('Returns');
    const allProducts = await readSheet('Products');
    const productMap = new Map(allProducts.map((p) => [p.product_id, p]));

    // Enrich all return records with product_name and exchange_product_name if missing
    let filtered = allReturns.map((r) => {
      let prodName = r.product_name;
      let exchName = r.exchange_product_name;

      if (!prodName && r.items_json) {
        try {
          const parsed = JSON.parse(r.items_json);
          prodName = parsed.returned_item?.product_name || parsed.product_name;
        } catch {}
      }
      if (!prodName && r.product_id) {
        prodName = productMap.get(r.product_id)?.name;
      }
      if (!exchName && r.exchange_product_id) {
        exchName = productMap.get(r.exchange_product_id)?.name;
      }

      return {
        ...r,
        product_name: prodName || r.product_id || 'Unknown Product',
        exchange_product_name: exchName || (r.exchange_product_id ? r.exchange_product_id : ''),
      };
    });

    if (q) {
      const term = q.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.return_number || '').toLowerCase().includes(term) ||
          (r.original_invoice || '').toLowerCase().includes(term) ||
          (r.customer_name || '').toLowerCase().includes(term) ||
          (r.product_name || '').toLowerCase().includes(term) ||
          (r.exchange_product_name || '').toLowerCase().includes(term)
      );
    }
    if (return_type) filtered = filtered.filter((r) => r.return_type === return_type);
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (sale_id) filtered = filtered.filter((r) => r.original_sale_id === sale_id || r.sale_id === sale_id);
    if (from) filtered = filtered.filter((r) => (r.return_date || r.created_at) >= from);
    if (to) filtered = filtered.filter((r) => (r.return_date || r.created_at) <= to + 'T23:59:59');

    // Summary statistics over the filtered set
    const stats = {
      total_returns: filtered.length,
      same_exchanges: filtered.filter((r) => r.return_type === 'exchange_same').length,
      diff_exchanges: filtered.filter((r) => r.return_type === 'exchange_diff').length,
      cash_refunds: filtered.filter((r) => r.return_type === 'cash_refund').length,
      total_refunded: filtered.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0),
      total_difference: filtered.reduce((s, r) => s + (Number(r.difference_amount) || 0), 0),
    };

    const total = filtered.length;
    const paginated = filtered
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(Number(offset), Number(offset) + Number(limit));

    return ok(res, { returns: paginated, total, stats });
  }

  // ─────────────────────────────────────────────
  // POST — Process Return or Exchange
  // ─────────────────────────────────────────────
  if (req.method === 'POST') {
    requireAuth(req, 'sales.return');

    const data = validate(ProcessReturnSchema, req.body);
    const now = new Date().toISOString();

    // ── Idempotency Check ──
    const allReturns = await readSheet('Returns');
    if (data.idempotency_key) {
      const existing = allReturns.find(
        (r) => r.notes && r.notes.includes(`idempotency:${data.idempotency_key}`)
      );
      if (existing) {
        return ok(res, { return: existing }, 'Return already recorded (idempotent)');
      }
    }

    // ── Retrieve Original Sale & Items ──
    const sale = await findOne('Sales', 'sale_id', data.sale_id);
    if (!sale) return fail(res, 'Original sale record not found', 404);
    if (sale.sale_status === 'cancelled') {
      return fail(res, 'Cannot return or exchange products from a cancelled sale', 400);
    }

    const allSaleItems = await readSheet('Sale_Items');
    const saleItems = allSaleItems.filter((i) => i.sale_id === data.sale_id);

    const saleItem = saleItems.find(
      (i) =>
        (data.returned_item.item_id && i.item_id === data.returned_item.item_id) ||
        i.product_id === data.returned_item.product_id
    );
    if (!saleItem) {
      return fail(res, 'The selected product was not found in this sale invoice', 404);
    }

    // ── Validate Return Quantity & Prevent Duplicate Returns ──
    const existingSaleReturns = allReturns.filter(
      (r) => r.original_sale_id === data.sale_id || r.sale_id === data.sale_id
    );
    const alreadyReturnedQty = existingSaleReturns
      .filter((r) => r.product_id === saleItem.product_id)
      .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

    const maxEligibleQty = (Number(saleItem.quantity) || 1) - alreadyReturnedQty;
    if (maxEligibleQty <= 0) {
      return fail(res, `This product has already been fully returned for invoice ${sale.invoice_number}`, 400);
    }
    if (data.returned_item.quantity > maxEligibleQty) {
      return fail(
        res,
        `Cannot return ${data.returned_item.quantity} units. Only ${maxEligibleQty} units remain eligible from original purchase of ${saleItem.quantity}.`,
        400
      );
    }

    // ── Load Products & Serials ──
    const products = await readSheet('Products');
    let returnedProduct = products.find((p) => p.product_id === saleItem.product_id);
    if (!returnedProduct && (saleItem.product_id === 'CUSTOM' || String(saleItem.product_id).startsWith('CUSTOM-') || saleItem.product_id === 'MANUAL')) {
      returnedProduct = {
        product_id: saleItem.product_id,
        name: saleItem.product_name || 'Custom Product',
        stock_quantity: 0,
        retail_price: saleItem.unit_price,
        purchase_cost: 0,
        is_custom: true,
      };
    }
    if (!returnedProduct) {
      return fail(res, 'Returned product record not found in catalog', 404);
    }

    // Proportional credit based on actual price paid (including discounts)
    const effectiveUnitPrice = Number(saleItem.total_price) / (Number(saleItem.quantity) || 1);
    const returnedCredit = Math.round(effectiveUnitPrice * data.returned_item.quantity);

    let exchangeProduct = null;
    let exchangeTotal = 0;
    let differenceAmount = 0;
    let refundAmount = 0;
    let paymentMethod = data.payment_method || 'cash';

    // ── Handle Return Option Specific Logic ──
    if (data.return_type === 'exchange_same') {
      // Exchange for Same Product
      exchangeProduct = returnedProduct;
      differenceAmount = 0;
      refundAmount = 0;

      // If returned item is damaged, replacement must come from remaining shelf stock
      if (data.returned_item.condition === 'damaged') {
        const availableStock = Number(returnedProduct.stock_quantity) || 0;
        if (availableStock < data.returned_item.quantity) {
          return fail(
            res,
            `Insufficient shelf stock to issue a replacement for ${returnedProduct.name} (available: ${availableStock})`,
            409
          );
        }
      }
    } else if (data.return_type === 'exchange_diff') {
      // Exchange for Another Product
      if (!data.exchange_item || !data.exchange_item.product_id) {
        return fail(res, 'Please select the replacement product for exchange', 400);
      }

      exchangeProduct = products.find((p) => p.product_id === data.exchange_item.product_id);
      if (!exchangeProduct) {
        return fail(res, 'Selected exchange product was not found in catalog', 404);
      }
      if (exchangeProduct.is_active === 'false') {
        return fail(res, `Selected exchange product is inactive: ${exchangeProduct.name}`, 400);
      }

      const exchangeQty = Number(data.exchange_item.quantity) || 1;
      const availableStock = Number(exchangeProduct.stock_quantity) || 0;
      if (availableStock < exchangeQty) {
        return fail(
          res,
          `Insufficient stock for replacement product "${exchangeProduct.name}" (requested: ${exchangeQty}, available: ${availableStock})`,
          409
        );
      }

      exchangeTotal = Number(exchangeProduct.retail_price) * exchangeQty;
      differenceAmount = exchangeTotal - returnedCredit;

      if (differenceAmount < 0) {
        // Shop owes customer refund
        refundAmount = Math.abs(differenceAmount);
      } else {
        refundAmount = 0;
      }
    } else if (data.return_type === 'cash_refund') {
      // Cash / Payment Refund
      refundAmount = Number(data.refund_amount) > 0 ? Number(data.refund_amount) : returnedCredit;
      if (refundAmount > returnedCredit) {
        return fail(res, `Refund amount cannot exceed the eligible item value of ${returnedCredit}`, 400);
      }
      differenceAmount = -refundAmount;
    }

    // ── Generate Return IDs ──
    const return_id = await generateId('RET', 'Returns', 'return_id');
    const returnCount = (await readSheet('Returns')).length;
    const return_number = `RET-${String(returnCount + 1).padStart(6, '0')}`;

    // ── Update Inventory & Stock Movements ──
    const returnQty = data.returned_item.quantity;
    const restockAction = data.returned_item.condition === 'damaged' ? 'damaged' : 'restock';

    // 1. Returned Item Inventory Update
    if (restockAction === 'restock') {
      const curStock = Number(returnedProduct.stock_quantity) || 0;
      let newStock = curStock + returnQty;

      // If exchanging for same product and restocked, one goes out immediately
      if (data.return_type === 'exchange_same') {
        newStock = curStock; // + returnQty - returnQty = net zero
      }

      if (!returnedProduct.is_custom) {
        await updateRow('Products', 'product_id', returnedProduct.product_id, {
          stock_quantity: newStock,
          updated_at: now,
        });
      }

      // Stock movement: return_in
      const movementInId = await generateId('MOV', 'Stock_Movements', 'movement_id');
      await appendRow('Stock_Movements', {
        movement_id: movementInId,
        product_id: returnedProduct.product_id,
        product_name: returnedProduct.name,
        serial_id: data.returned_item.serial_id || '',
        movement_type: 'return_in',
        quantity_change: returnQty,
        quantity_before: curStock,
        quantity_after: curStock + returnQty,
        related_id: return_id,
        related_type: 'return',
        reason: `Customer return (${data.return_type}): ${data.reason}`,
        notes: `Original Invoice: ${sale.invoice_number}`,
        recorded_by: user.user_id,
        created_at: now,
      });
    } else {
      // Item is damaged: record damage movement without increasing sellable stock
      const curStock = Number(returnedProduct.stock_quantity) || 0;
      let newStock = curStock;

      if (data.return_type === 'exchange_same') {
        // Deduct the replacement given to customer
        newStock = Math.max(0, curStock - returnQty);
        if (!returnedProduct.is_custom) {
          await updateRow('Products', 'product_id', returnedProduct.product_id, {
            stock_quantity: newStock,
            updated_at: now,
          });
        }
      }

      const damageMovId = await generateId('MOV', 'Stock_Movements', 'movement_id');
      await appendRow('Stock_Movements', {
        movement_id: damageMovId,
        product_id: returnedProduct.product_id,
        product_name: returnedProduct.name,
        serial_id: data.returned_item.serial_id || '',
        movement_type: 'damage',
        quantity_change: 0,
        quantity_before: curStock,
        quantity_after: newStock,
        related_id: return_id,
        related_type: 'return',
        reason: `Defective return quarantined: ${data.reason}`,
        notes: `Original Invoice: ${sale.invoice_number}`,
        recorded_by: user.user_id,
        created_at: now,
      });
    }

    // 2. Outgoing Replacement / Exchange Item Inventory Update
    if (data.return_type === 'exchange_diff' && exchangeProduct) {
      const exchangeQty = Number(data.exchange_item.quantity) || 1;
      const curExchangeStock = Number(exchangeProduct.stock_quantity) || 0;
      const newExchangeStock = Math.max(0, curExchangeStock - exchangeQty);

      await updateRow('Products', 'product_id', exchangeProduct.product_id, {
        stock_quantity: newExchangeStock,
        updated_at: now,
      });

      const movementOutId = await generateId('MOV', 'Stock_Movements', 'movement_id');
      await appendRow('Stock_Movements', {
        movement_id: movementOutId,
        product_id: exchangeProduct.product_id,
        product_name: exchangeProduct.name,
        serial_id: '',
        movement_type: 'sale_out',
        quantity_change: -exchangeQty,
        quantity_before: curExchangeStock,
        quantity_after: newExchangeStock,
        related_id: return_id,
        related_type: 'return',
        reason: `Exchange replacement issued for Return ${return_number}`,
        notes: `Replaced item from invoice: ${sale.invoice_number}`,
        recorded_by: user.user_id,
        created_at: now,
      });
    } else if (data.return_type === 'exchange_same' && restockAction === 'restock') {
      // Movement out for the replacement unit of same product
      const curStock = Number(returnedProduct.stock_quantity) || 0;
      const movementSameOutId = await generateId('MOV', 'Stock_Movements', 'movement_id');
      await appendRow('Stock_Movements', {
        movement_id: movementSameOutId,
        product_id: returnedProduct.product_id,
        product_name: returnedProduct.name,
        serial_id: '',
        movement_type: 'sale_out',
        quantity_change: -returnQty,
        quantity_before: curStock,
        quantity_after: curStock,
        related_id: return_id,
        related_type: 'return',
        reason: `Same product replacement issued for Return ${return_number}`,
        notes: `Replacement for invoice: ${sale.invoice_number}`,
        recorded_by: user.user_id,
        created_at: now,
      });
    }

    // ── Update Serial Record if applicable ──
    if (data.returned_item.serial_id) {
      await updateRow('Serials', 'serial_id', data.returned_item.serial_id, {
        status: restockAction === 'damaged' ? 'damaged' : 'available',
        updated_at: now,
      });
    }

    // ── Financial Records / Additional Payments ──
    if (data.return_type === 'exchange_diff' && differenceAmount > 0) {
      // Customer paid additional difference
      const payment_id = await generateId('PAY', 'Payments', 'payment_id');
      await appendRow('Payments', {
        payment_id,
        payment_type: 'customer_receipt',
        related_id: return_id,
        party_id: sale.customer_id || 'WALK_IN',
        party_name: sale.customer_name || 'Walk-in Customer',
        party_type: 'customer',
        amount: differenceAmount,
        payment_method: paymentMethod,
        reference_number: data.reference_number || '',
        payment_date: now.split('T')[0],
        notes: `Exchange difference collected for Return ${return_number} (Inv ${sale.invoice_number})`,
        recorded_by: user.user_id,
        idempotency_key: data.idempotency_key || `diff-${return_id}`,
        created_at: now,
      });
    }

    // ── Build Return Record ──
    const itemsJson = JSON.stringify({
      returned_item: {
        product_id: returnedProduct.product_id,
        product_name: returnedProduct.name,
        model: returnedProduct.model,
        sku: returnedProduct.sku,
        quantity: returnQty,
        unit_price: Number(saleItem.unit_price) || 0,
        effective_unit_price: effectiveUnitPrice,
        total_credit: returnedCredit,
        condition: restockAction,
        serial_id: data.returned_item.serial_id || '',
        imei1: data.returned_item.imei1 || '',
      },
      exchange_item: exchangeProduct
        ? {
            product_id: exchangeProduct.product_id,
            product_name: exchangeProduct.name,
            model: exchangeProduct.model,
            sku: exchangeProduct.sku,
            quantity: Number(data.exchange_item?.quantity) || 1,
            unit_price: Number(exchangeProduct.retail_price) || 0,
            total_price: exchangeTotal,
          }
        : null,
    });

    const notesWithIdempotency = [
      data.notes || '',
      data.idempotency_key ? `idempotency:${data.idempotency_key}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const returnRecord = {
      return_id,
      return_number,
      original_sale_id: sale.sale_id,
      original_invoice: sale.invoice_number,
      customer_id: sale.customer_id || 'WALK_IN',
      customer_name: sale.customer_name || 'Walk-in Customer',
      return_type: data.return_type,
      return_date: now.split('T')[0],
      reason: data.reason,
      product_id: returnedProduct.product_id,
      product_name: returnedProduct.name,
      quantity: returnQty,
      unit_price: Number(saleItem.unit_price) || 0,
      total_amount: returnedCredit,
      exchange_product_id: exchangeProduct ? exchangeProduct.product_id : '',
      exchange_product_name: exchangeProduct ? exchangeProduct.name : '',
      exchange_quantity: exchangeProduct ? (Number(data.exchange_item?.quantity) || 1) : 0,
      exchange_unit_price: exchangeProduct ? Number(exchangeProduct.retail_price) : 0,
      difference_amount: differenceAmount,
      payment_method: paymentMethod,
      refund_amount: refundAmount,
      refund_method: refundAmount > 0 ? paymentMethod : '',
      refund_reference: data.reference_number || '',
      stock_action: restockAction,
      status: 'completed',
      processed_by: user.user_id,
      processed_by_name: user.name || 'Staff',
      items_json: itemsJson,
      notes: notesWithIdempotency,
      created_at: now,
      updated_at: now,
    };

    await appendRow('Returns', returnRecord);

    // ── Update Original Sale Status ──
    // Check if all items in this sale have now been returned
    const updatedSaleReturns = [...existingSaleReturns, returnRecord];
    let allItemsFullyReturned = true;
    for (const item of saleItems) {
      const itemReturnsQty = updatedSaleReturns
        .filter((r) => r.product_id === item.product_id)
        .reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      if (itemReturnsQty < Number(item.quantity)) {
        allItemsFullyReturned = false;
        break;
      }
    }

    const newSaleStatus = allItemsFullyReturned ? 'returned' : 'partially_returned';
    await updateRow('Sales', 'sale_id', sale.sale_id, {
      sale_status: newSaleStatus,
      updated_at: now,
    });

    await logActivity(
      user,
      'create',
      'return',
      return_id,
      `Processed ${data.return_type} return ${return_number} for invoice ${sale.invoice_number}`
    );

    return ok(
      res,
      {
        return: returnRecord,
        return_id,
        return_number,
        details: JSON.parse(itemsJson),
      },
      'Return processed successfully',
      201
    );
  }

  return fail(res, 'Method not allowed', 405);
});
