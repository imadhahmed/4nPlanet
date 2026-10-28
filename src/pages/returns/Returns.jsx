// src/pages/returns/Returns.jsx
// Complete Returns & Exchanges Management for 4N Planet POS
// Allows cashiers to search invoice, select product, enter reason, and choose:
// 1. Exchange for Same Product
// 2. Exchange for Another Product (with automatic price difference calculation)
// 3. Cash Refund

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  RotateCcw, ArrowLeftRight, Banknote, Search, Printer, CheckCircle,
  AlertCircle, RefreshCw, Plus, X, Package, Check, ArrowRight,
  User, Calendar, ShieldCheck, AlertTriangle, ChevronRight,
  Receipt, ArrowDownLeft, ArrowUpRight, Filter, Clock, ShoppingBag
} from 'lucide-react';
import {
  returns as returnsApi,
  products as productsApi,
  sales as salesApi,
} from '../../services/api.js';
import {
  formatCurrency, formatDate, formatDateTime, returnTypeBadge, paymentStatusBadge
} from '../../utils/format.js';
import toast from 'react-hot-toast';
import logoImg from '../../assets/4N Planet POS System Logo.png';

const REASON_PRESETS = [
  'Defective / Faulty Item',
  'Wrong Model / Color Selected',
  'Customer Changed Mind',
  'Compatibility / Network Issue',
  'Warranty Replacement Claim',
  'Other',
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Credit/Debit Card' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'mobile_payment', label: 'Mobile Payment' },
];

export default function Returns({ defaultTab = 'history' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tab State
  const initialTab = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab); // 'history' | 'new'

  // ─────────────────────────────────────────────
  // RETURN HISTORY STATE
  // ─────────────────────────────────────────────
  const [returnList, setReturnList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyStats, setHistoryStats] = useState({
    total_returns: 0,
    same_exchanges: 0,
    diff_exchanges: 0,
    cash_refunds: 0,
    total_refunded: 0,
    total_difference: 0,
  });
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  // ─────────────────────────────────────────────
  // NEW RETURN WIZARD STATE
  // ─────────────────────────────────────────────
  // Step 1 Search Mode: 'invoice' | 'product' | 'recent_sales'
  const [step1Mode, setStep1Mode] = useState('invoice');
  const [invoiceSearch, setInvoiceSearch] = useState(searchParams.get('invoice') || '');
  const [productSoldQuery, setProductSoldQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedSaleResult, setSelectedSaleResult] = useState(null);
  const [lookupResults, setLookupResults] = useState([]);
  const [recentSalesList, setRecentSalesList] = useState([]);
  const [recentSalesLoading, setRecentSalesLoading] = useState(false);

  // Selected item to return
  const [selectedItem, setSelectedItem] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnCondition, setReturnCondition] = useState('restock'); // 'restock' | 'damaged'
  const [returnReason, setReturnReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Option: 'exchange_same' | 'exchange_diff' | 'cash_refund'
  const [returnType, setReturnType] = useState('exchange_same');

  // Exchange for another product state
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedExchangeProduct, setSelectedExchangeProduct] = useState(null);
  const [exchangeQuantity, setExchangeQuantity] = useState(1);

  // Settlement details
  const [refundAmountOverride, setRefundAmountOverride] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // ─────────────────────────────────────────────
  // LOAD RETURN HISTORY
  // ─────────────────────────────────────────────
  const fetchHistory = () => {
    setHistoryLoading(true);
    returnsApi
      .list({
        q: historyQuery,
        return_type: historyTypeFilter,
        from: historyFrom,
        to: historyTo,
        limit: 100,
      })
      .then((res) => {
        setReturnList(res.data.data.returns || []);
        if (res.data.data.stats) {
          setHistoryStats(res.data.data.stats);
        }
      })
      .catch((err) => {
        toast.error('Failed to load return history');
      })
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyQuery, historyTypeFilter, historyFrom, historyTo]);

  // Load product catalog for exchange selection
  useEffect(() => {
    if (activeTab === 'new') {
      setCatalogLoading(true);
      productsApi
        .list({ status: 'active', limit: 200 })
        .then((res) => {
          setCatalogProducts(res.data.data.products || []);
        })
        .catch(() => {})
        .finally(() => setCatalogLoading(false));

      loadRecentSales();
    }
  }, [activeTab]);

  // Load recent sales history for direct selection
  const loadRecentSales = async () => {
    setRecentSalesLoading(true);
    try {
      const res = await returnsApi.lookup({ action: 'recent_sales' });
      setRecentSalesList(res.data.data.results || []);
    } catch {
      // Non-critical background load
    } finally {
      setRecentSalesLoading(false);
    }
  };

  // Auto-search invoice if URL param exists
  useEffect(() => {
    const invParam = searchParams.get('invoice');
    if (invParam) {
      setInvoiceSearch(invParam);
      handleLookupInvoice(invParam);
    }
  }, []);

  // ─────────────────────────────────────────────
  // INVOICE & PRODUCT LOOKUP
  // ─────────────────────────────────────────────
  const handleLookupInvoice = async (queryToSearch) => {
    const term = (queryToSearch || invoiceSearch).trim();
    if (!term) {
      toast.error('Please enter an invoice number or customer name');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await returnsApi.lookup({ invoice: term });
      const results = res.data.data.results || [];
      setLookupResults(results);

      if (results.length === 1) {
        selectSale(results[0]);
      } else if (results.length === 0) {
        setSelectedSaleResult(null);
        toast.error('No matching sale invoice found');
      }
    } catch (err) {
      toast.error('Error finding invoice. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Lookup sales by product name, model, barcode or SKU
  const handleProductLookup = async (queryTerm) => {
    const term = (queryTerm !== undefined ? queryTerm : productSoldQuery).trim();
    if (!term) {
      toast.error('Please enter a product name, model, barcode or SKU');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await returnsApi.lookup({ product: term });
      const results = res.data.data.results || [];
      setLookupResults(results);

      if (results.length === 1) {
        selectSale(results[0], term);
      } else if (results.length === 0) {
        setSelectedSaleResult(null);
        toast.error(`No sales found containing product "${term}"`);
      }
    } catch (err) {
      toast.error('Error finding sales for product. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const selectSale = (saleData, matchedProductTerm) => {
    setSelectedSaleResult(saleData);
    setLookupResults([]);
    setSelectedItem(null);
    setReturnQuantity(1);
    setSelectedExchangeProduct(null);
    setExchangeQuantity(1);
    setRefundAmountOverride('');

    // Pre-select matched item by product search, or first eligible item
    let targetItem = null;
    if (matchedProductTerm) {
      targetItem = saleData.items.find(
        (i) => i.is_matched_product && i.eligible_quantity > 0
      );
    }
    if (!targetItem) {
      targetItem = saleData.items.find((i) => i.eligible_quantity > 0);
    }

    if (targetItem) {
      setSelectedItem(targetItem);
      setReturnQuantity(1);
    }
  };

  const resetWizard = () => {
    setSelectedSaleResult(null);
    setSelectedItem(null);
    setReturnQuantity(1);
    setReturnCondition('restock');
    setReturnReason('');
    setCustomReason('');
    setReturnType('exchange_same');
    setSelectedExchangeProduct(null);
    setExchangeQuantity(1);
    setRefundAmountOverride('');
    setPaymentMethod('cash');
    setReferenceNumber('');
    setInvoiceSearch('');
    setLookupResults([]);
  };

  // ─────────────────────────────────────────────
  // PRICE & SETTLEMENT CALCULATIONS
  // ─────────────────────────────────────────────
  const calculations = useMemo(() => {
    if (!selectedItem) {
      return {
        unitCredit: 0,
        totalCredit: 0,
        exchangeTotal: 0,
        difference: 0,
        customerPays: 0,
        customerRefund: 0,
        maxEligibleRefund: 0,
      };
    }

    // Effective unit price paid (accounting for line item discounts)
    const effectiveUnitPrice =
      Number(selectedItem.total_price || 0) / (Number(selectedItem.quantity) || 1);
    const totalCredit = Math.round(effectiveUnitPrice * returnQuantity);

    let exchangeTotal = 0;
    if (returnType === 'exchange_same') {
      exchangeTotal = totalCredit; // Even swap
    } else if (returnType === 'exchange_diff' && selectedExchangeProduct) {
      exchangeTotal =
        (Number(selectedExchangeProduct.retail_price) || 0) * (Number(exchangeQuantity) || 1);
    }

    const difference = returnType === 'exchange_diff' ? exchangeTotal - totalCredit : 0;
    const customerPays = difference > 0 ? difference : 0;
    const customerRefund =
      returnType === 'cash_refund'
        ? Number(refundAmountOverride) > 0
          ? Number(refundAmountOverride)
          : totalCredit
        : difference < 0
        ? Math.abs(difference)
        : 0;

    return {
      unitCredit: effectiveUnitPrice,
      totalCredit,
      exchangeTotal,
      difference,
      customerPays,
      customerRefund,
      maxEligibleRefund: totalCredit,
    };
  }, [
    selectedItem,
    returnQuantity,
    returnType,
    selectedExchangeProduct,
    exchangeQuantity,
    refundAmountOverride,
  ]);

  // Filter catalog products for exchange search
  const filteredCatalog = useMemo(() => {
    if (!productSearch) return catalogProducts.slice(0, 8);
    const term = productSearch.toLowerCase();
    return catalogProducts
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.model?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.barcode?.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [catalogProducts, productSearch]);

  // ─────────────────────────────────────────────
  // SUBMIT RETURN / EXCHANGE
  // ─────────────────────────────────────────────
  const handleSubmitReturn = async () => {
    if (!selectedSaleResult || !selectedItem) {
      toast.error('Please select an item to return');
      return;
    }

    const finalReason = customReason.trim()
      ? `${returnReason ? returnReason + ': ' : ''}${customReason.trim()}`
      : returnReason;

    if (!finalReason) {
      toast.error('Please provide a reason for the return');
      return;
    }

    if (returnType === 'exchange_diff' && !selectedExchangeProduct) {
      toast.error('Please select the replacement product');
      return;
    }

    if (returnType === 'exchange_diff') {
      const stockAvailable = Number(selectedExchangeProduct.stock_quantity) || 0;
      if (stockAvailable < exchangeQuantity) {
        toast.error(`Not enough stock for ${selectedExchangeProduct.name}. Only ${stockAvailable} available.`);
        return;
      }
    }

    if (returnType === 'exchange_same' && returnCondition === 'damaged') {
      const stockAvailable = Number(selectedItem.stock_quantity || 0);
      if (stockAvailable < returnQuantity) {
        toast.error('Not enough shelf stock to issue a replacement of the same product.');
        return;
      }
    }

    const payload = {
      sale_id: selectedSaleResult.sale.sale_id,
      return_type: returnType,
      returned_item: {
        item_id: selectedItem.item_id || '',
        product_id: selectedItem.product_id,
        product_name: selectedItem.product_name,
        quantity: Number(returnQuantity),
        condition: returnCondition,
        serial_id: selectedItem.serial_id || '',
        imei1: selectedItem.imei1 || '',
      },
      exchange_item:
        returnType === 'exchange_diff' && selectedExchangeProduct
          ? {
              product_id: selectedExchangeProduct.product_id,
              product_name: selectedExchangeProduct.name,
              quantity: Number(exchangeQuantity),
              unit_price: Number(selectedExchangeProduct.retail_price) || 0,
            }
          : returnType === 'exchange_same'
          ? {
              product_id: selectedItem.product_id,
              product_name: selectedItem.product_name,
              quantity: Number(returnQuantity),
              unit_price: Number(selectedItem.unit_price) || 0,
            }
          : null,
      reason: finalReason,
      refund_amount: calculations.customerRefund,
      difference_amount: calculations.difference,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      idempotency_key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      notes: `Invoice: ${selectedSaleResult.sale.invoice_number}`,
    };

    setSubmitting(true);
    try {
      const res = await returnsApi.create(payload);
      const createdReturn = res.data.data.return;
      const details = res.data.data.details || {};

      toast.success('Return / Exchange processed successfully!');

      // Open Return Receipt
      setReceiptData({
        ...createdReturn,
        details,
        original_sale: selectedSaleResult.sale,
      });
      setReceiptModalOpen(true);

      // Reset wizard form
      resetWizard();
      // Refresh history in background
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to process return';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open receipt for any historic return
  const handleViewReceipt = async (returnItem) => {
    try {
      const res = await returnsApi.get(returnItem.return_id);
      setReceiptData(res.data.data.return);
      setReceiptModalOpen(true);
    } catch {
      // Fallback to item itself if get fails
      setReceiptData(returnItem);
      setReceiptModalOpen(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Returns & Exchanges</h1>
          <p className="page-subtitle">
            Manage product returns, same/model exchanges, and cash refunds with real-time inventory updates
          </p>
        </div>
        <div className="page-actions">
          {activeTab === 'history' ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveTab('new');
                setSearchParams({ tab: 'new' });
              }}
            >
              <Plus size={16} /> New Return / Exchange
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setActiveTab('history');
                setSearchParams({ tab: 'history' });
              }}
            >
              <Receipt size={16} /> View Return History
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="tabs no-print" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('new');
            setSearchParams({ tab: 'new' });
          }}
        >
          <RotateCcw size={15} /> Process Return / Exchange
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            setSearchParams({ tab: 'history' });
          }}
        >
          <Receipt size={15} /> Return History ({historyStats.total_returns || 0})
        </button>
      </div>

      {/* ═════════════════════════════════════════════
          TAB 1: NEW RETURN / EXCHANGE WIZARD
      ═════════════════════════════════════════════ */}
      {activeTab === 'new' && (
        <div className="no-print" style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Step 1: Find Original Sale (By Invoice, Product, or Sales History) */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ paddingBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    1
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: 16 }}>
                      Find Original Sale
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Search by invoice/customer, search by product, or select directly from sales history
                    </div>
                  </div>
                </div>

                {/* Search Mode Selector Tabs */}
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    background: 'var(--neutral-surface)',
                    padding: 3,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStep1Mode('invoice');
                      setLookupResults([]);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: step1Mode === 'invoice' ? '#FFFFFF' : 'transparent',
                      color: step1Mode === 'invoice' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: step1Mode === 'invoice' ? 700 : 500,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: step1Mode === 'invoice' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Search size={13} />
                    <span>By Invoice / Customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep1Mode('product');
                      setLookupResults([]);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: step1Mode === 'product' ? '#FFFFFF' : 'transparent',
                      color: step1Mode === 'product' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: step1Mode === 'product' ? 700 : 500,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: step1Mode === 'product' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Package size={13} />
                    <span>Search by Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep1Mode('recent_sales');
                      setLookupResults([]);
                      loadRecentSales();
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: step1Mode === 'recent_sales' ? '#FFFFFF' : 'transparent',
                      color: step1Mode === 'recent_sales' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: step1Mode === 'recent_sales' ? 700 : 500,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: step1Mode === 'recent_sales' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <Clock size={13} />
                    <span>Sales History</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body">
              {/* Mode 1: Search by Invoice Number or Customer Name */}
              {step1Mode === 'invoice' && (
                <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
                  <div className="search-input-wrapper" style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} className="search-icon" />
                    <input
                      type="search"
                      className="form-input"
                      placeholder="Enter Invoice # (e.g., INV-000001) or customer name/phone..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookupInvoice()}
                      autoFocus
                    />
                    {invoiceSearch && (
                      <button
                        type="button"
                        onClick={() => setInvoiceSearch('')}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleLookupInvoice()}
                    disabled={lookupLoading}
                    style={{ minWidth: 130 }}
                  >
                    {lookupLoading ? 'Searching…' : 'Search Invoice'}
                  </button>
                </div>
              )}

              {/* Mode 2: Search by Sold Product (Name, Model, Barcode, SKU) */}
              {step1Mode === 'product' && (
                <div>
                  <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
                    <div className="search-input-wrapper" style={{ flex: 1, position: 'relative' }}>
                      <Package size={16} className="search-icon" />
                      <input
                        type="search"
                        className="form-input"
                        placeholder="Search sold product name, model, barcode, or SKU (e.g. Anker, iPhone)..."
                        value={productSoldQuery}
                        onChange={(e) => setProductSoldQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleProductLookup()}
                        autoFocus
                      />
                      {productSoldQuery && (
                        <button
                          type="button"
                          onClick={() => setProductSoldQuery('')}
                          style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleProductLookup()}
                      disabled={lookupLoading}
                      style={{ minWidth: 140 }}
                    >
                      {lookupLoading ? 'Searching…' : 'Find by Product'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                    Tip: Enter the customer’s product or scan its barcode to find all past invoices containing that item.
                  </div>
                </div>
              )}

              {/* Mode 3: Direct Selection from Recent Sales History */}
              {step1Mode === 'recent_sales' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy-dark)' }}>
                      Recent Sales History (Click any sale to select it for return)
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={loadRecentSales}
                      disabled={recentSalesLoading}
                      style={{ fontSize: 11.5 }}
                    >
                      <RefreshCw size={12} className={recentSalesLoading ? 'spin' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {recentSalesLoading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading recent sales history…
                    </div>
                  ) : recentSalesList.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                      <p>No recent sales found</p>
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: 320,
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <table style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Sold Products</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSalesList.map((res) => {
                            const isSelected = selectedSaleResult?.sale?.sale_id === res.sale.sale_id;
                            return (
                              <tr
                                key={res.sale.sale_id}
                                style={{
                                  background: isSelected ? 'var(--primary-light)' : undefined,
                                }}
                              >
                                <td style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>
                                  {res.sale.invoice_number}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                  {formatDate(res.sale.sale_date)}
                                </td>
                                <td style={{ fontWeight: 600, fontSize: 12.5 }}>
                                  {res.sale.customer_name || 'Walk-in'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {res.items.slice(0, 3).map((item, idx) => (
                                      <span
                                        key={idx}
                                        style={{
                                          fontSize: 11,
                                          background: 'var(--neutral-surface)',
                                          padding: '2px 6px',
                                          borderRadius: 'var(--radius-sm)',
                                          border: '1px solid var(--border-subtle)',
                                        }}
                                      >
                                        <strong>{item.quantity}x</strong> {item.product_name}
                                      </span>
                                    ))}
                                    {res.items.length > 3 && (
                                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                        +{res.items.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                                  {formatCurrency(res.sale.grand_total)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      fontSize: 11,
                                      padding: '3px 8px',
                                      fontWeight: 700,
                                      color: isSelected ? 'var(--primary)' : undefined,
                                    }}
                                    onClick={() => selectSale(res)}
                                    disabled={!res.can_return}
                                  >
                                    {isSelected ? '✓ Selected' : 'Select for Return'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Search Matches Dropdown */}
              {lookupResults.length > 1 && (
                <div
                  style={{
                    marginTop: 12,
                    border: '1.5px solid var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: '#FFF',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 14px',
                      background: 'var(--primary-light)',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{lookupResults.length} invoices match your search. Select one:</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: 0 }}
                      onClick={() => setLookupResults([])}
                    >
                      <X size={13} /> Close
                    </button>
                  </div>
                  {lookupResults.map((res) => (
                    <div
                      key={res.sale.sale_id}
                      onClick={() => selectSale(res, productSoldQuery)}
                      style={{
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      className="hover-highlight"
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: 'var(--navy-dark)', fontSize: 14 }}>
                            {res.sale.invoice_number}
                          </span>
                          <span className={`badge ${paymentStatusBadge(res.sale.payment_status)}`}>
                            {res.sale.payment_status}
                          </span>
                          {!res.can_return && (
                            <span className="badge badge-amber" style={{ fontSize: 10 }}>Already Returned</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Customer: <strong>{res.sale.customer_name}</strong> · Date: {formatDate(res.sale.sale_date)}
                        </div>
                        {/* Sold Products in this invoice */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                          {res.items.map((it, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 11,
                                padding: '2px 7px',
                                borderRadius: 'var(--radius-sm)',
                                background: it.is_matched_product ? '#FEF3C7' : 'var(--neutral-surface)',
                                border: it.is_matched_product ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
                                color: it.is_matched_product ? '#92400E' : 'var(--navy-dark)',
                                fontWeight: it.is_matched_product ? 700 : 500,
                              }}
                            >
                              {it.quantity}x {it.product_name}
                              {it.is_matched_product && ' ★'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>
                          {formatCurrency(res.sale.grand_total)}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: 6, fontSize: 11 }}
                          disabled={!res.can_return}
                        >
                          Select for Return
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Invoice Details Banner */}
              {selectedSaleResult && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: 'var(--primary-light)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-dark)' }}>
                          {selectedSaleResult.sale.invoice_number}
                        </span>
                        <span
                          className={`badge ${paymentStatusBadge(
                            selectedSaleResult.sale.payment_status
                          )}`}
                        >
                          {selectedSaleResult.sale.payment_status}
                        </span>
                        {selectedSaleResult.sale.sale_status === 'returned' && (
                          <span className="badge badge-amber">Fully Returned</span>
                        )}
                        {selectedSaleResult.sale.sale_status === 'partially_returned' && (
                          <span className="badge badge-blue">Partially Returned</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: 'var(--text-primary)',
                          marginTop: 4,
                          display: 'flex',
                          gap: 16,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          <strong>Customer:</strong> {selectedSaleResult.sale.customer_name}
                        </span>
                        <span>
                          <strong>Date:</strong> {formatDateTime(selectedSaleResult.sale.sale_date)}
                        </span>
                        <span>
                          <strong>Cashier:</strong> {selectedSaleResult.sale.cashier_name}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Invoice Total</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy-dark)' }}>
                        {formatCurrency(selectedSaleResult.sale.grand_total)}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, marginTop: 4, color: 'var(--primary)' }}
                        onClick={() => setSelectedSaleResult(null)}
                      >
                        Change Invoice
                      </button>
                    </div>
                  </div>

                  {!selectedSaleResult.can_return && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '8px 12px',
                        background: '#FEF2F2',
                        color: 'var(--danger)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 12.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={15} />
                      {selectedSaleResult.sale.sale_status === 'cancelled'
                        ? 'This invoice was cancelled and cannot be returned.'
                        : 'All items in this invoice have already been returned or exchanged.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select Purchased Product & Validate Quantity */}
          {selectedSaleResult && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    2
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: 16 }}>
                      Select Product to Return
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Click on the item being returned. Return quantities are automatically validated against original purchase.
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* List of items from invoice */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                  {selectedSaleResult.items.map((item) => {
                    const isSelected = selectedItem?.item_id === item.item_id;
                    const isFullyReturned = item.eligible_quantity <= 0;

                    return (
                      <div
                        key={item.item_id}
                        onClick={() => !isFullyReturned && setSelectedItem(item)}
                        style={{
                          padding: 14,
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${
                            isSelected
                              ? 'var(--primary)'
                              : isFullyReturned
                              ? 'var(--border-subtle)'
                              : 'var(--border-color)'
                          }`,
                          background: isSelected
                            ? 'var(--primary-light)'
                            : isFullyReturned
                            ? 'var(--neutral-surface)'
                            : '#FFFFFF',
                          opacity: isFullyReturned ? 0.65 : 1,
                          cursor: isFullyReturned ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: `2px solid ${
                                isSelected ? 'var(--primary)' : 'var(--border-color)'
                              }`,
                              background: isSelected ? 'var(--primary)' : '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <Check size={12} color="#FFF" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--navy-dark)', fontSize: 14 }}>
                              {item.product_name}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {item.model && <span>Model: {item.model} · </span>}
                              {item.imei1 && <span>IMEI: {item.imei1} · </span>}
                              <span>Unit Price: {formatCurrency(item.unit_price)}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-dark)' }}>
                            Purchased: {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                          </div>
                          {item.already_returned_qty > 0 && (
                            <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 2 }}>
                              Already Returned: {item.already_returned_qty}
                            </div>
                          )}
                          <div style={{ marginTop: 4 }}>
                            {isFullyReturned ? (
                              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                                Fully Returned
                              </span>
                            ) : (
                              <span className="badge badge-green" style={{ fontSize: 11 }}>
                                {item.eligible_quantity} eligible to return
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Return Configuration for Selected Item */}
                {selectedItem && (
                  <div
                    style={{
                      background: 'var(--neutral-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      padding: 18,
                      marginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 20,
                      }}
                    >
                      {/* Quantity Selector */}
                      <div>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'block',
                            marginBottom: 8,
                          }}
                        >
                          Return Quantity (Max: {selectedItem.eligible_quantity})
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            disabled={returnQuantity <= 1}
                            onClick={() => setReturnQuantity((q) => Math.max(1, q - 1))}
                            style={{ width: 38, height: 38 }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="form-input"
                            min="1"
                            max={selectedItem.eligible_quantity}
                            value={returnQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setReturnQuantity(
                                Math.min(Math.max(1, val), selectedItem.eligible_quantity)
                              );
                            }}
                            style={{
                              width: 80,
                              textAlign: 'center',
                              fontSize: 16,
                              fontWeight: 700,
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-icon"
                            disabled={returnQuantity >= selectedItem.eligible_quantity}
                            onClick={() =>
                              setReturnQuantity((q) =>
                                Math.min(selectedItem.eligible_quantity, q + 1)
                              )
                            }
                            style={{ width: 38, height: 38 }}
                          >
                            +
                          </button>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            unit{returnQuantity > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Item Condition Selector */}
                      <div>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            display: 'block',
                            marginBottom: 8,
                          }}
                        >
                          Condition of Returned Unit
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => setReturnCondition('restock')}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: `1.5px solid ${
                                returnCondition === 'restock'
                                  ? 'var(--success)'
                                  : 'var(--border-color)'
                              }`,
                              background:
                                returnCondition === 'restock' ? 'var(--success-light)' : '#FFF',
                              color:
                                returnCondition === 'restock'
                                  ? 'var(--success)'
                                  : 'var(--text-primary)',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            ✓ Resellable (Restock)
                          </button>
                          <button
                            type="button"
                            onClick={() => setReturnCondition('damaged')}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: `1.5px solid ${
                                returnCondition === 'damaged'
                                  ? 'var(--danger)'
                                  : 'var(--border-color)'
                              }`,
                              background:
                                returnCondition === 'damaged' ? 'var(--danger-light)' : '#FFF',
                              color:
                                returnCondition === 'damaged'
                                  ? 'var(--danger)'
                                  : 'var(--text-primary)',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            ⚠ Defective (Quarantine)
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                          {returnCondition === 'restock'
                            ? 'Unit is in good shape and will be returned to active inventory stock.'
                            : 'Unit is broken/faulty. Stock movement will record as damaged/quarantine.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Return Reason */}
          {selectedItem && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    3
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: 16 }}>
                      Return Reason
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Select a common preset or describe why the product is being returned
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* Reason Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReturnReason(preset)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: `1.5px solid ${
                          returnReason === preset ? 'var(--primary)' : 'var(--border-color)'
                        }`,
                        background: returnReason === preset ? 'var(--primary-light)' : '#FFF',
                        color: returnReason === preset ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Additional Notes */}
                <input
                  type="text"
                  className="form-input"
                  placeholder="Additional return notes or specific defect details..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: Choose One of Three Options */}
          {selectedItem && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    4
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: 16 }}>
                      Choose Resolution Option
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Select whether customer is getting the same product, a different product, or a cash refund
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {/* 3 Prominent Option Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  {/* Option 1: Same Product Exchange */}
                  <div
                    onClick={() => setReturnType('exchange_same')}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${
                        returnType === 'exchange_same' ? 'var(--primary)' : 'var(--border-color)'
                      }`,
                      background:
                        returnType === 'exchange_same' ? 'var(--primary-light)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-sm)',
                          background:
                            returnType === 'exchange_same' ? 'var(--primary)' : 'var(--neutral-surface)',
                          color: returnType === 'exchange_same' ? '#FFF' : 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <RotateCcw size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-dark)' }}>
                          Exchange for Same Product
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          Replace with identical model
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      One-for-one unit replacement. Price difference is <strong>LKR 0.00</strong> (even swap).
                    </p>
                  </div>

                  {/* Option 2: Another Product Exchange */}
                  <div
                    onClick={() => setReturnType('exchange_diff')}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${
                        returnType === 'exchange_diff' ? 'var(--purple)' : 'var(--border-color)'
                      }`,
                      background:
                        returnType === 'exchange_diff' ? 'var(--purple-light)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-sm)',
                          background:
                            returnType === 'exchange_diff' ? 'var(--purple)' : 'var(--neutral-surface)',
                          color: returnType === 'exchange_diff' ? '#FFF' : 'var(--purple)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ArrowLeftRight size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-dark)' }}>
                          Exchange for Another Product
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          Choose any product from catalog
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Automatically calculates price difference. Collect extra payment or refund the difference.
                    </p>
                  </div>

                  {/* Option 3: Cash Refund */}
                  <div
                    onClick={() => setReturnType('cash_refund')}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${
                        returnType === 'cash_refund' ? 'var(--warning)' : 'var(--border-color)'
                      }`,
                      background:
                        returnType === 'cash_refund' ? 'var(--warning-light)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-sm)',
                          background:
                            returnType === 'cash_refund' ? 'var(--warning)' : 'var(--neutral-surface)',
                          color: returnType === 'cash_refund' ? '#FFF' : 'var(--warning)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Banknote size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-dark)' }}>
                          Cash Refund
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          Refund purchase amount
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Refund eligible amount back to the customer and record payment refund details.
                    </p>
                  </div>
                </div>

                {/* ── Sub-view for Option 1: Same Product Exchange ── */}
                {returnType === 'exchange_same' && (
                  <div
                    style={{
                      padding: 16,
                      background: 'var(--neutral-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>
                          Replacement Unit: {selectedItem.product_name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Quantity: {returnQuantity} unit{returnQuantity > 1 ? 's' : ''} · Model: {selectedItem.model || 'Standard'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Price Difference</div>
                        <strong style={{ fontSize: 16, color: 'var(--primary)' }}>
                          LKR 0.00 (Even Exchange)
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Sub-view for Option 2: Another Product Exchange ── */}
                {returnType === 'exchange_diff' && (
                  <div
                    style={{
                      padding: 18,
                      background: 'var(--neutral-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 10 }}>
                      Select Replacement Product
                    </h4>

                    {/* Search Catalog */}
                    <div style={{ marginBottom: 12 }}>
                      <div className="search-input-wrapper" style={{ position: 'relative' }}>
                        <Search size={15} className="search-icon" />
                        <input
                          type="search"
                          className="form-input"
                          style={{ paddingRight: productSearch ? 32 : 12 }}
                          placeholder="Search replacement by name, model, barcode (Press Enter to pick)..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const first = filteredCatalog.find((p) => Number(p.stock_quantity) > 0);
                              if (first) {
                                setSelectedExchangeProduct(first);
                                setExchangeQuantity(1);
                              }
                            }
                          }}
                        />
                        {productSearch && (
                          <button
                            type="button"
                            onClick={() => setProductSearch('')}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              padding: 2,
                            }}
                            title="Clear search"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Selected replacement preview */}
                    {selectedExchangeProduct ? (
                      <div
                        style={{
                          padding: 12,
                          background: '#FFF',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--purple)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>
                            {selectedExchangeProduct.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {selectedExchangeProduct.model} · Stock Available: {selectedExchangeProduct.stock_quantity}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Quantity</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon btn-sm"
                                disabled={exchangeQuantity <= 1}
                                onClick={() => setExchangeQuantity((q) => Math.max(1, q - 1))}
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                                {exchangeQuantity}
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-icon btn-sm"
                                disabled={exchangeQuantity >= (Number(selectedExchangeProduct.stock_quantity) || 1)}
                                onClick={() => setExchangeQuantity((q) => q + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Unit Price</div>
                            <div style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>
                              {formatCurrency(selectedExchangeProduct.retail_price)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => setSelectedExchangeProduct(null)}
                            title="Remove replacement"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Product Quick List */
                      <div
                        style={{
                          maxHeight: 220,
                          overflowY: 'auto',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          background: '#FFF',
                          marginBottom: 14,
                        }}
                      >
                        {filteredCatalog.map((prod) => {
                          const stock = Number(prod.stock_quantity) || 0;
                          const isOut = stock <= 0;
                          return (
                            <div
                              key={prod.product_id}
                              onClick={() => {
                                if (!isOut) {
                                  setSelectedExchangeProduct(prod);
                                  setExchangeQuantity(1);
                                }
                              }}
                              style={{
                                padding: '9px 12px',
                                borderBottom: '1px solid var(--border-subtle)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: isOut ? 'not-allowed' : 'pointer',
                                opacity: isOut ? 0.5 : 1,
                              }}
                              className={!isOut ? 'hover-highlight' : ''}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-dark)' }}>
                                  {prod.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                  {prod.brand_name} · {prod.model}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-dark)' }}>
                                  {formatCurrency(prod.retail_price)}
                                </div>
                                <span
                                  className={`badge ${isOut ? 'badge-red' : 'badge-blue'}`}
                                  style={{ fontSize: 10 }}
                                >
                                  {isOut ? 'Out of stock' : `${stock} in stock`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Price Difference Breakdown */}
                    {selectedExchangeProduct && (
                      <div
                        style={{
                          background: '#FFF',
                          padding: 14,
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Returned Product Credit ({returnQuantity} × {formatCurrency(calculations.unitCredit)}):
                          </span>
                          <strong style={{ color: 'var(--navy-dark)' }}>
                            {formatCurrency(calculations.totalCredit)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            New Product Total ({exchangeQuantity} × {formatCurrency(selectedExchangeProduct.retail_price)}):
                          </span>
                          <strong style={{ color: 'var(--navy-dark)' }}>
                            {formatCurrency(calculations.exchangeTotal)}
                          </strong>
                        </div>
                        <div
                          style={{
                            borderTop: '1px solid var(--border-color)',
                            paddingTop: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-dark)' }}>
                            {calculations.difference > 0
                              ? 'Additional Amount to Collect:'
                              : calculations.difference < 0
                              ? 'Refund Amount to Customer:'
                              : 'Even Exchange:'}
                          </span>
                          <strong
                            style={{
                              fontSize: 17,
                              color:
                                calculations.difference > 0
                                  ? 'var(--success)'
                                  : calculations.difference < 0
                                  ? 'var(--danger)'
                                  : 'var(--primary)',
                            }}
                          >
                            {formatCurrency(Math.abs(calculations.difference))}
                          </strong>
                        </div>

                        {/* Payment / Refund Method */}
                        {calculations.difference !== 0 && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: 12,
                              }}
                            >
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                  {calculations.difference > 0 ? 'Collection Method' : 'Refund Method'}
                                </label>
                                <select
                                  className="form-select"
                                  value={paymentMethod}
                                  onChange={(e) => setPaymentMethod(e.target.value)}
                                  style={{ marginTop: 4 }}
                                >
                                  {PAYMENT_METHODS.map((pm) => (
                                    <option key={pm.id} value={pm.id}>
                                      {pm.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {paymentMethod !== 'cash' && (
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Reference / Txn #
                                  </label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Card auth code or transfer ref..."
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    style={{ marginTop: 4 }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Sub-view for Option 3: Cash Refund ── */}
                {returnType === 'cash_refund' && (
                  <div
                    style={{
                      padding: 18,
                      background: 'var(--neutral-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 16,
                      }}
                    >
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Refund Amount (Max: {formatCurrency(calculations.maxEligibleRefund)})
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}
                          placeholder={formatCurrency(calculations.maxEligibleRefund)}
                          value={refundAmountOverride}
                          max={calculations.maxEligibleRefund}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRefundAmountOverride(
                              val > calculations.maxEligibleRefund
                                ? calculations.maxEligibleRefund
                                : e.target.value
                            );
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, marginTop: 4, color: 'var(--primary)', padding: 0 }}
                          onClick={() => setRefundAmountOverride(calculations.maxEligibleRefund)}
                        >
                          Fill Full Eligible Amount ({formatCurrency(calculations.maxEligibleRefund)})
                        </button>
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Refund Method
                        </label>
                        <select
                          className="form-select"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          style={{ marginTop: 4 }}
                        >
                          {PAYMENT_METHODS.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {paymentMethod !== 'cash' && (
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Reference Number
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Card slip or transfer reference..."
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Final Review & Confirmation Panel */}
          {selectedItem && (
            <div
              className="card"
              style={{
                marginBottom: 30,
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div className="card-body" style={{ padding: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Transaction Summary
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-dark)', marginTop: 2 }}>
                      Returning {returnQuantity} × {selectedItem.product_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {returnType === 'exchange_same' && 'Same model replacement issued · Zero balance'}
                      {returnType === 'exchange_diff' &&
                        (calculations.difference > 0
                          ? `Customer pays additional difference of ${formatCurrency(calculations.difference)} via ${paymentMethod}`
                          : calculations.difference < 0
                          ? `Refund difference of ${formatCurrency(Math.abs(calculations.difference))} to customer via ${paymentMethod}`
                          : 'Even swap with different model')}
                      {returnType === 'cash_refund' &&
                        `Issuing refund of ${formatCurrency(calculations.customerRefund)} via ${paymentMethod}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={resetWizard}>
                      Reset Form
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSubmitReturn}
                      disabled={submitting}
                      style={{ minWidth: 160 }}
                    >
                      {submitting ? (
                        <>Processing…</>
                      ) : (
                        <>
                          <CheckCircle size={16} /> Confirm & Print Receipt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════
          TAB 2: RETURN HISTORY LIST
      ═════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="no-print">
          {/* Summary Metric Cards */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Total Returns</div>
              <div className="stat-value">{historyStats.total_returns || 0}</div>
              <div className="stat-sub">All recorded requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Product Exchanges</div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>
                {(historyStats.same_exchanges || 0) + (historyStats.diff_exchanges || 0)}
              </div>
              <div className="stat-sub">
                {historyStats.same_exchanges || 0} same · {historyStats.diff_exchanges || 0} different
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cash Refunds</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {historyStats.cash_refunds || 0}
              </div>
              <div className="stat-sub">
                Total: {formatCurrency(historyStats.total_refunded || 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Net Settlement</div>
              <div className="stat-value" style={{ color: 'var(--navy-dark)' }}>
                {formatCurrency(historyStats.total_difference || 0)}
              </div>
              <div className="stat-sub">Cashier balances</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="card">
            {/* Filter Bar */}
            <div className="filter-bar">
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <Search size={15} className="search-icon" />
                <input
                  type="search"
                  className="form-input"
                  placeholder="Return #, invoice, customer, product..."
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
              </div>

              <select
                className="form-select"
                style={{ width: 180 }}
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
              >
                <option value="">All Return Types</option>
                <option value="exchange_same">Same Exchange</option>
                <option value="exchange_diff">Different Exchange</option>
                <option value="cash_refund">Cash Refund</option>
              </select>

              <input
                type="date"
                className="form-input"
                style={{ width: 140 }}
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                placeholder="From date"
              />
              <input
                type="date"
                className="form-input"
                style={{ width: 140 }}
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                placeholder="To date"
              />
            </div>

            {/* Table */}
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Return #</th>
                    <th>Date</th>
                    <th>Original Invoice</th>
                    <th>Customer</th>
                    <th>Product Name & Exchange Details</th>
                    <th>Type</th>
                    <th>Amount / Diff</th>
                    <th>Cashier</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={10} style={{ padding: 16 }}>
                          <div className="skeleton-line" style={{ width: '100%', height: 20 }} />
                        </td>
                      </tr>
                    ))
                  ) : returnList.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state" style={{ padding: 40 }}>
                          <div className="empty-state-icon">
                            <RotateCcw size={28} />
                          </div>
                          <h3>No Returns or Exchanges Found</h3>
                          <p>
                            {historyQuery || historyTypeFilter || historyFrom
                              ? 'No records match your filters'
                              : 'No product returns or exchanges have been processed yet'}
                          </p>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: 12 }}
                            onClick={() => {
                              setActiveTab('new');
                              setSearchParams({ tab: 'new' });
                            }}
                          >
                            <Plus size={14} /> Process First Return
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    returnList.map((ret) => {
                      const typeBadge = returnTypeBadge(ret.return_type);
                      const isSame = ret.return_type === 'exchange_same';
                      const isDiff = ret.return_type === 'exchange_diff';
                      const isRefund = ret.return_type === 'cash_refund';

                      return (
                        <tr key={ret.return_id}>
                          <td style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>
                            {ret.return_number || ret.return_id}
                          </td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                            {formatDate(ret.return_date || ret.created_at)}
                          </td>
                          <td>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--primary)',
                                cursor: 'pointer',
                              }}
                              onClick={() => navigate(`/sales`)}
                              title="View sales"
                            >
                              {ret.original_invoice}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{ret.customer_name || 'Walk-in'}</td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy-dark)' }}>
                              {ret.product_name || ret.product_id || 'Unknown Product'}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: 'var(--text-secondary)',
                                marginTop: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>
                                Qty: <strong>{ret.quantity}</strong> unit{ret.quantity > 1 ? 's' : ''}
                              </span>
                              <span>•</span>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  color: ret.stock_action === 'damaged' ? 'var(--danger)' : 'var(--success)',
                                }}
                              >
                                {ret.stock_action === 'damaged' ? 'Damaged (Discarded)' : 'Resellable (Restocked)'}
                              </span>
                            </div>
                            {ret.exchange_product_name && (
                              <div
                                style={{
                                  fontSize: 11.5,
                                  color: 'var(--purple)',
                                  marginTop: 4,
                                  background: '#F5F3FF',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontWeight: 600,
                                }}
                              >
                                <span>↳ Exchanged for:</span>
                                <strong>{ret.exchange_product_name}</strong>
                                {Number(ret.exchange_quantity) > 1 && (
                                  <span>({ret.exchange_quantity} pcs)</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${typeBadge.className}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td>
                            {isRefund && (
                              <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                                - {formatCurrency(ret.refund_amount)}
                              </span>
                            )}
                            {isSame && (
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                                Even (LKR 0.00)
                              </span>
                            )}
                            {isDiff && (
                              <span
                                style={{
                                  fontWeight: 700,
                                  color:
                                    Number(ret.difference_amount) > 0
                                      ? 'var(--success)'
                                      : Number(ret.difference_amount) < 0
                                      ? 'var(--danger)'
                                      : 'var(--primary)',
                                }}
                              >
                                {Number(ret.difference_amount) > 0 ? '+ ' : ''}
                                {formatCurrency(ret.difference_amount)}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12.5 }}>{ret.processed_by_name || 'Staff'}</td>
                          <td>
                            <span className="badge badge-green">
                              {ret.status || 'Completed'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleViewReceipt(ret)}
                              title="View and Print Return Receipt"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                            >
                              <Printer size={14} /> Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════
          RETURN RECEIPT MODAL & PRINT VIEW
      ═════════════════════════════════════════════ */}
      {receiptModalOpen && receiptData && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div
            className="modal"
            style={{
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {/* Modal Actions Header */}
            <div
              className="modal-header no-print"
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--neutral-surface)',
              }}
            >
              <h3 className="modal-title" style={{ fontSize: 16 }}>
                Return Receipt — {receiptData.return_number || receiptData.return_id}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <Printer size={14} /> Print Receipt
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setReceiptModalOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div
              className="invoice card"
              style={{
                margin: 0,
                padding: 36,
                border: 'none',
                boxShadow: 'none',
              }}
            >
              {/* Receipt Header */}
              <div className="invoice-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={logoImg}
                    alt="4N Planet"
                    style={{ width: 52, height: 52, objectFit: 'contain' }}
                  />
                  <div>
                    <div className="invoice-brand">4N Planet</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Mobile Phone & Accessories
                    </div>
                  </div>
                </div>
                <div className="invoice-meta">
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: 'var(--primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    RETURN & EXCHANGE RECEIPT
                  </div>
                  <div className="invoice-number" style={{ fontSize: 17 }}>
                    {receiptData.return_number || receiptData.return_id}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Date: {formatDateTime(receiptData.return_date || receiptData.created_at)}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span
                      className={`badge ${returnTypeBadge(receiptData.return_type).className}`}
                    >
                      {returnTypeBadge(receiptData.return_type).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Original Invoice & Customer Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                  margin: '20px 0',
                  padding: '14px 0',
                  borderTop: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Customer Details
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-dark)', marginTop: 2 }}>
                    {receiptData.customer_name || 'Walk-in Customer'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Processed By: {receiptData.processed_by_name || 'Cashier Staff'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Original Sale Information
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-dark)', marginTop: 2 }}>
                    Invoice: {receiptData.original_invoice}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Reason: {receiptData.reason || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Returned Item Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 8 }}>
                  Returned Merchandise
                </div>
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th>Condition</th>
                      <th style={{ textAlign: 'right' }}>Credit Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600 }}>{receiptData.product_name}</div>
                        {receiptData.details?.returned_item?.model && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            Model: {receiptData.details.returned_item.model}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {receiptData.quantity}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            receiptData.stock_action === 'damaged'
                              ? 'badge-amber'
                              : 'badge-green'
                          }`}
                          style={{ fontSize: 11 }}
                        >
                          {receiptData.stock_action === 'damaged'
                            ? 'Defective (Quarantined)'
                            : 'Good (Restocked)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(receiptData.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Exchanged Item Details (if applicable) */}
              {(receiptData.return_type === 'exchange_same' ||
                receiptData.return_type === 'exchange_diff') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 8 }}>
                    Replacement Merchandise Issued
                  </div>
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Item Description</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {receiptData.exchange_product_name || receiptData.product_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {receiptData.return_type === 'exchange_same'
                              ? 'Identical model replacement'
                              : 'Catalog model exchange'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {receiptData.exchange_quantity || receiptData.quantity}
                        </td>
                        <td>
                          {formatCurrency(
                            receiptData.exchange_unit_price || receiptData.unit_price
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(
                            (Number(receiptData.exchange_unit_price || receiptData.unit_price) || 0) *
                              (Number(receiptData.exchange_quantity || receiptData.quantity) || 1)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals & Settlement Box */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div className="invoice-totals" style={{ minWidth: 280 }}>
                  <div className="invoice-total-row">
                    <span>Returned Product Credit</span>
                    <span>{formatCurrency(receiptData.total_amount)}</span>
                  </div>

                  {receiptData.return_type === 'exchange_diff' && (
                    <>
                      <div className="invoice-total-row">
                        <span>New Product Total</span>
                        <span>
                          {formatCurrency(
                            (Number(receiptData.exchange_unit_price) || 0) *
                              (Number(receiptData.exchange_quantity) || 1)
                          )}
                        </span>
                      </div>
                      <div className="invoice-total-row grand">
                        <span>Price Difference</span>
                        <span style={{ color: 'var(--navy-dark)' }}>
                          {formatCurrency(receiptData.difference_amount)}
                        </span>
                      </div>
                      {Number(receiptData.difference_amount) > 0 && (
                        <div className="invoice-total-row" style={{ color: 'var(--success)' }}>
                          <span>Additional Paid ({receiptData.payment_method})</span>
                          <span>{formatCurrency(receiptData.difference_amount)}</span>
                        </div>
                      )}
                      {Number(receiptData.difference_amount) < 0 && (
                        <div className="invoice-total-row" style={{ color: 'var(--danger)' }}>
                          <span>Refund Given ({receiptData.refund_method || receiptData.payment_method})</span>
                          <span>{formatCurrency(Math.abs(receiptData.difference_amount))}</span>
                        </div>
                      )}
                    </>
                  )}

                  {receiptData.return_type === 'exchange_same' && (
                    <div className="invoice-total-row grand">
                      <span>Net Settlement</span>
                      <span style={{ color: 'var(--primary)' }}>Even Swap (LKR 0.00)</span>
                    </div>
                  )}

                  {receiptData.return_type === 'cash_refund' && (
                    <div className="invoice-total-row grand">
                      <span style={{ color: 'var(--danger)' }}>
                        Refunded Amount ({receiptData.refund_method || 'Cash'})
                      </span>
                      <span style={{ color: 'var(--danger)' }}>
                        {formatCurrency(receiptData.refund_amount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Footer */}
              <div
                style={{
                  marginTop: 32,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border-color)',
                  textAlign: 'center',
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                  Thank you for shopping at 4N Planet!
                </p>
                <p style={{ marginTop: 4 }}>
                  Please retain this return receipt for your records and warranty validation.
                </p>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
                  <div style={{ borderTop: '1px solid var(--border-color)', width: 140, paddingTop: 4 }}>
                    Cashier Signature
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-color)', width: 140, paddingTop: 4 }}>
                    Customer Signature
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer no-print"
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--neutral-surface)',
              }}
            >
              <button className="btn btn-secondary" onClick={() => setReceiptModalOpen(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
