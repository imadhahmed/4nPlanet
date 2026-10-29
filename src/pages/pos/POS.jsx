// src/pages/pos/POS.jsx — Point of Sale (Master UI Theme)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X, User, Printer,
  CreditCard, Banknote, Smartphone, CheckCircle, ArrowRight,
  Tag, RotateCcw, Maximize2, Edit3, ShoppingBag, Check, Layers,
  ChevronLeft
} from 'lucide-react';
import {
  products as productsApi,
  customers as customersApi,
  sales as salesApi,
  categories as categoriesApi,
} from '../../services/api.js';
import { formatCurrency, initials } from '../../utils/format.js';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { id: 'mobile_payment', label: 'Mobile Pay', icon: Smartphone },
];

function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function POS() {
  const navigate = useNavigate();
  const [productList, setProductList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cartItems, setCartItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [page, setPage] = useState('pos'); // 'pos' | 'success'

  // Cart View Step: 'items' (shows maximum height for items) | 'payment' (shows settlement controls)
  const [cartViewTab, setCartViewTab] = useState('items');

  // ── Quantity & Amount Popup Modal State ──
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalUnitPrice, setModalUnitPrice] = useState('');
  const [modalDiscount, setModalDiscount] = useState(0);
  const [editingCartIndex, setEditingCartIndex] = useState(null);
  const qtyInputRef = useRef(null);

  // ── Product Search & Autocomplete Dropdown State ──
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Detailed Full Cart View Modal State ──
  const [fullCartModalOpen, setFullCartModalOpen] = useState(false);

  // ── Manual / Custom Product Modal State ──
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualNote, setManualNote] = useState('');
  const [editingManualIndex, setEditingManualIndex] = useState(null);
  const manualNameInputRef = useRef(null);

  // Load products and categories on mount
  useEffect(() => {
    productsApi.list({ status: 'active' }).then((res) => {
      setProductList(res.data.data.products || []);
    }).catch(() => {});

    categoriesApi.list().then((res) => {
      setCategoriesList(res.data.data.categories || []);
    }).catch(() => {});
  }, []);

  // Customer search with debounce
  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(() => {
      customersApi.list({ q: customerSearch }).then((res) => {
        setCustomerResults(res.data.data.customers?.slice(0, 5) || []);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Autofocus input when Quantity Modal opens
  useEffect(() => {
    if (quantityModalOpen && qtyInputRef.current) {
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    }
  }, [quantityModalOpen]);

  // Close product search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick keyboard handler: Press Enter on search to select product without scrolling
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = productSearch.trim().toLowerCase();
      if (!term) return;

      // 1. Exact barcode or SKU match takes priority
      const exactMatch = productList.find(
        (p) =>
          p.barcode?.toLowerCase() === term ||
          p.sku?.toLowerCase() === term
      );
      if (exactMatch && Number(exactMatch.stock_quantity) > 0) {
        setShowSearchDropdown(false);
        handleProductCardClick(exactMatch);
        return;
      }

      // 2. Otherwise pick first available in-stock product from current filtered list
      const firstAvailable = filteredProducts.find(
        (p) => Number(p.stock_quantity) > 0
      );
      if (firstAvailable) {
        setShowSearchDropdown(false);
        handleProductCardClick(firstAvailable);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
    }
  };

  // Filter products by search and category
  const filteredProducts = productList.filter((p) => {
    const matchesSearch = productSearch
      ? p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.model?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
      : true;

    const matchesCategory = selectedCategory === 'ALL'
      ? true
      : p.category_id === selectedCategory || p.category_name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // ── Manual / Custom Product Entry Actions ──
  const openManualItemModal = (initialName = '') => {
    setEditingManualIndex(null);
    setManualName(typeof initialName === 'string' ? initialName : '');
    setManualPrice('');
    setManualQty(1);
    setManualDiscount(0);
    setManualNote('');
    setManualModalOpen(true);
    setTimeout(() => {
      manualNameInputRef.current?.focus();
    }, 60);
  };

  const openEditManualItemModal = (idx) => {
    const item = cartItems[idx];
    setEditingManualIndex(idx);
    setManualName(item.name || '');
    setManualPrice(item.unit_price ?? '');
    setManualQty(item.quantity || 1);
    setManualDiscount(item.discount || 0);
    setManualNote(item.model === 'Manual Product' ? '' : (item.model || ''));
    setManualModalOpen(true);
    setTimeout(() => {
      manualNameInputRef.current?.focus();
      manualNameInputRef.current?.select();
    }, 60);
  };

  const handleAddManualItem = (e) => {
    if (e) e.preventDefault();
    const name = manualName.trim();
    if (!name) {
      toast.error('Please enter the product name');
      return;
    }
    const price = Number(manualPrice);
    if (manualPrice === '' || isNaN(price) || price < 0) {
      toast.error('Please enter a valid unit price (0 or greater)');
      return;
    }
    const qty = parseInt(manualQty, 10);
    if (!qty || qty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }
    const disc = Number(manualDiscount) || 0;
    if (disc < 0) {
      toast.error('Discount cannot be negative');
      return;
    }

    if (editingManualIndex !== null && editingManualIndex >= 0) {
      // Editing existing manual item
      setCartItems((prev) =>
        prev.map((item, i) =>
          i === editingManualIndex
            ? {
                ...item,
                name,
                model: manualNote.trim() || 'Manual Product',
                unit_price: price,
                quantity: qty,
                discount: disc,
              }
            : item
        )
      );
      toast.success(`Updated "${name}" in cart`);
    } else {
      // Adding new manual item
      const customId = `CUSTOM-${Date.now()}`;
      const newItem = {
        product_id: customId,
        name,
        model: manualNote.trim() || 'Manual Product',
        brand: 'Custom',
        unit_price: price,
        purchase_cost: 0,
        quantity: qty,
        discount: disc,
        max_stock: 999999,
        warranty_duration: '',
        is_phone: false,
        is_custom: true,
        serial_id: '',
        imei1: '',
      };
      setCartItems((prev) => [...prev, newItem]);
      toast.success(`Added "${name}" to cart (Qty: ${qty})`);
    }

    setManualModalOpen(false);
    setEditingManualIndex(null);
    setCartViewTab('items');
  };

  // ── Open Quantity Modal on Product Card Click ──
  const handleProductCardClick = (product) => {
    const stock = Number(product.stock_quantity) || 0;
    if (stock <= 0) {
      toast.error('This product is out of stock');
      return;
    }

    setModalProduct(product);
    setEditingCartIndex(null);
    setModalQty(1);
    setModalUnitPrice(Number(product.retail_price) || 0);
    setModalDiscount(0);
    setQuantityModalOpen(true);
  };

  // ── Open Modal to Edit Existing Cart Item ──
  const handleEditCartItem = (idx) => {
    const item = cartItems[idx];
    if (item.is_custom) {
      openEditManualItemModal(idx);
      return;
    }
    const product = productList.find((p) => p.product_id === item.product_id) || {
      product_id: item.product_id,
      name: item.name,
      model: item.model,
      brand_name: item.brand,
      stock_quantity: item.max_stock,
      retail_price: item.unit_price,
      purchase_cost: item.purchase_cost,
      warranty_duration: item.warranty_duration,
    };

    setModalProduct(product);
    setEditingCartIndex(idx);
    setModalQty(item.quantity);
    setModalUnitPrice(item.unit_price);
    setModalDiscount(item.discount || 0);
    setQuantityModalOpen(true);
  };

  // ── Confirm Quantity Modal and Add/Update Cart ──
  const handleConfirmQuantityModal = (e) => {
    if (e) e.preventDefault();
    if (!modalProduct) return;

    const qty = parseInt(modalQty, 10);
    if (!qty || qty < 1) {
      toast.error('Please enter a valid quantity of at least 1');
      return;
    }

    const stock = Number(modalProduct.stock_quantity) || 0;
    const unitPrice = modalUnitPrice !== '' ? Number(modalUnitPrice) : Number(modalProduct.retail_price) || 0;
    const discount = Number(modalDiscount) || 0;

    if (unitPrice < 0) {
      toast.error('Unit price cannot be negative');
      return;
    }

    if (discount < 0) {
      toast.error('Discount cannot be negative');
      return;
    }

    if (editingCartIndex !== null && editingCartIndex >= 0) {
      // Editing existing cart item
      if (qty > stock) {
        toast.error(`Cannot exceed available stock of ${stock}`);
        return;
      }
      setCartItems((prev) =>
        prev.map((item, i) =>
          i === editingCartIndex
            ? { ...item, quantity: qty, unit_price: unitPrice, discount }
            : item
        )
      );
      toast.success(`Updated ${modalProduct.name} (Qty: ${qty})`);
    } else {
      // Adding new product or incrementing existing in cart
      const existingIdx = cartItems.findIndex((it) => it.product_id === modalProduct.product_id);
      if (existingIdx !== -1) {
        const curQty = cartItems[existingIdx].quantity;
        const totalNewQty = curQty + qty;
        if (totalNewQty > stock) {
          toast.error(`Cannot exceed available stock (${stock}). Already ${curQty} in cart.`);
          return;
        }
        setCartItems((prev) =>
          prev.map((it, i) =>
            i === existingIdx
              ? {
                  ...it,
                  quantity: totalNewQty,
                  unit_price: unitPrice,
                  discount: discount > 0 ? discount : it.discount,
                }
              : it
          )
        );
        toast.success(`Added ${qty} more to cart (Total: ${totalNewQty})`);
      } else {
        if (qty > stock) {
          toast.error(`Cannot exceed available stock of ${stock}`);
          return;
        }
        setCartItems((prev) => [
          ...prev,
          {
            product_id: modalProduct.product_id,
            name: modalProduct.name,
            model: modalProduct.model,
            brand: modalProduct.brand_name,
            unit_price: unitPrice,
            purchase_cost: Number(modalProduct.purchase_cost) || 0,
            quantity: qty,
            discount,
            serial_id: '',
            imei1: '',
            max_stock: stock,
            warranty_duration: modalProduct.warranty_duration || '',
          },
        ]);
        toast.success(`Added ${qty} × ${modalProduct.name} to cart`);
      }
    }

    // Switch to items view so cashier immediately sees the product in cart
    setCartViewTab('items');
    setQuantityModalOpen(false);
    setModalProduct(null);
    setEditingCartIndex(null);
  };

  const updateQty = (idx, delta) => {
    const item = cartItems[idx];
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (!item.is_custom && newQty > item.max_stock) {
      toast.error(`Cannot exceed available stock (${item.max_stock})`);
      return;
    }
    setCartItems(cartItems.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
  };

  const removeItem = (idx) => {
    setCartItems(cartItems.filter((_, i) => i !== idx));
  };

  // Calculations
  const totalUnits = cartItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const subtotal = cartItems.reduce((sum, i) => sum + (i.unit_price * i.quantity - i.discount), 0);
  const grandTotal = Math.max(0, subtotal - invoiceDiscount);
  const tendered = Number(amountPaid) || 0;
  const change = Math.max(0, tendered - grandTotal);
  const outstanding = Math.max(0, grandTotal - tendered);

  const canCheckout = cartItems.length > 0;

  // Standard checkout flow
  const handleCheckout = async () => {
    if (!canCheckout) return;
    if (tendered < 0) {
      toast.error('Amount paid cannot be negative');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        customer_id: customer?.customer_id || 'WALK_IN',
        sale_date: new Date().toISOString(),
        items: cartItems.map((i) => ({
          product_id: i.product_id,
          product_name: i.name,
          model: i.model || '',
          brand: i.brand || '',
          is_custom: Boolean(i.is_custom),
          serial_id: i.serial_id || '',
          imei1: i.imei1 || '',
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
        })),
        discount_amount: invoiceDiscount,
        tax_amount: 0,
        amount_paid: tendered,
        payment_methods: [{
          method: paymentMethod,
          amount: tendered,
          reference: '',
        }],
        notes: '',
        idempotency_key: generateIdempotencyKey(),
      };

      const res = await salesApi.create(saleData);
      setCompletedSale(res.data.data);
      setPage('success');
      toast.success(`Sale completed! Invoice: ${res.data.data.invoice_number}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Sale failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click cash sale directly from items view
  const handleQuickCashSale = async () => {
    if (!canCheckout) return;
    setLoading(true);
    try {
      const saleData = {
        customer_id: customer?.customer_id || 'WALK_IN',
        sale_date: new Date().toISOString(),
        items: cartItems.map((i) => ({
          product_id: i.product_id,
          product_name: i.name,
          model: i.model || '',
          brand: i.brand || '',
          is_custom: Boolean(i.is_custom),
          serial_id: i.serial_id || '',
          imei1: i.imei1 || '',
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
        })),
        discount_amount: invoiceDiscount,
        tax_amount: 0,
        amount_paid: grandTotal,
        payment_methods: [{
          method: 'cash',
          amount: grandTotal,
          reference: '',
        }],
        notes: '',
        idempotency_key: generateIdempotencyKey(),
      };

      const res = await salesApi.create(saleData);
      setCompletedSale(res.data.data);
      setPage('success');
      toast.success(`Sale completed! Invoice: ${res.data.data.invoice_number}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Sale failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetPOS = () => {
    setCartItems([]);
    setCustomer(null);
    setAmountPaid('');
    setInvoiceDiscount(0);
    setCompletedSale(null);
    setPage('pos');
    setCartViewTab('items');
    setProductSearch('');
    setSelectedCategory('ALL');
  };

  // Quick tender helper
  const handleAddTender = (extra) => {
    const cur = Number(amountPaid) || 0;
    setAmountPaid(cur + extra);
  };

  // ── Success Receipt Screen ──
  if (page === 'success' && completedSale) {
    return (
      <div style={{ maxWidth: 540, margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--success-light)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            <CheckCircle size={36} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy-dark)', marginBottom: 6 }}>
            Sale Completed Successfully
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13.5 }}>
            Invoice <strong style={{ color: 'var(--primary)' }}>{completedSale.invoice_number}</strong> has been created.
          </p>

          <div style={{
            background: 'var(--neutral-surface)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)', padding: 20, textAlign: 'left', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Grand Total</span>
              <strong style={{ fontSize: 17, color: 'var(--navy-dark)' }}>
                {formatCurrency(completedSale.sale?.grand_total)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Amount Paid</span>
              <strong style={{ color: 'var(--success)' }}>
                {formatCurrency(completedSale.sale?.amount_paid)}
              </strong>
            </div>
            {Number(completedSale.sale?.outstanding_balance) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--danger)', fontSize: 13 }}>Outstanding Balance</span>
                <strong style={{ color: 'var(--danger)' }}>
                  {formatCurrency(completedSale.sale?.outstanding_balance)}
                </strong>
              </div>
            )}
            {change > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 8,
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Change Returned</span>
                <strong style={{ color: 'var(--success)', fontSize: 17 }}>
                  {formatCurrency(change)}
                </strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => navigate(`/sales/${completedSale.sale?.sale_id}`)}
            >
              <Printer size={15} />
              <span>Print Invoice</span>
            </button>
            <button className="btn btn-primary btn-full" onClick={resetPOS}>
              <Plus size={15} />
              <span>New Sale</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate modal line total
  const modalLineTotal = Math.max(
    0,
    (Number(modalUnitPrice || modalProduct?.retail_price) || 0) * (parseInt(modalQty, 10) || 0) -
      (Number(modalDiscount) || 0)
  );

  return (
    <div className="pos-layout">
      {/* ── Left Column: Product Browser ── */}
      <div className="pos-products">
        {/* Search & Top Bar (Fixed Header - Never Scrolls) */}
        <div className="pos-search-header">
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <Search size={15} className="search-icon" />
            <input
              ref={searchInputRef}
              type="search"
              className="form-input"
              style={{ paddingRight: productSearch ? 32 : 12 }}
              placeholder="Search products by name, model, SKU, barcode (Press Enter to add)..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => {
                if (productSearch.trim().length > 0) setShowSearchDropdown(true);
              }}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => {
                  setProductSearch('');
                  setShowSearchDropdown(false);
                }}
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

            {/* Instant Search Results Dropdown (Instant selection without needing to scroll) */}
            {showSearchDropdown && productSearch.trim().length > 0 && (
              <div
                ref={searchDropdownRef}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--primary)',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06)',
                  zIndex: 80,
                  maxHeight: 340,
                  overflowY: 'auto',
                }}
              >
                {filteredProducts.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <div>No products matching "<strong>{productSearch}</strong>"</div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 8, fontSize: 12 }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowSearchDropdown(false);
                        openManualItemModal(productSearch);
                      }}
                    >
                      <Plus size={13} /> Sell "{productSearch}" as Manual Product
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: '8px 14px',
                      background: 'var(--neutral-surface)',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span>{filteredProducts.length} matching product{filteredProducts.length > 1 ? 's' : ''} (Click to add or press Enter)</span>
                      <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>ESC to close</span>
                    </div>
                    {filteredProducts.slice(0, 10).map((p) => {
                      const stock = Number(p.stock_quantity) || 0;
                      const isOut = stock === 0;
                      const inCart = cartItems.find((i) => i.product_id === p.product_id);
                      return (
                        <div
                          key={p.product_id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (!isOut) {
                              setShowSearchDropdown(false);
                              handleProductCardClick(p);
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: isOut ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: isOut ? 0.5 : 1,
                            background: inCart ? 'rgba(49, 87, 213, 0.04)' : '#FFFFFF',
                            transition: 'background 0.15s ease',
                          }}
                          className={!isOut ? 'hover-highlight' : ''}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy-dark)' }}>
                                {p.name}
                              </span>
                              {inCart && (
                                <span style={{
                                  fontSize: 10,
                                  background: 'var(--primary-light)',
                                  color: 'var(--primary)',
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  fontWeight: 700,
                                }}>
                                  {inCart.quantity} in cart
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {p.brand_name || 'Generic'} {p.model ? `· ${p.model}` : ''} {p.sku ? `· SKU: ${p.sku}` : ''} {p.barcode ? `· ${p.barcode}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>
                              {formatCurrency(p.retail_price)}
                            </div>
                            <div style={{ fontSize: 11, color: isOut ? 'var(--danger)' : 'var(--text-secondary)', marginTop: 2 }}>
                              {isOut ? 'Out of stock' : `${stock} in stock`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowSearchDropdown(false);
                        openManualItemModal(productSearch);
                      }}
                      style={{
                        padding: '9px 14px',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--neutral-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                      className="hover-highlight"
                    >
                      <Plus size={13} />
                      <span>Sell custom / manual product not in list</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Add Manual / Custom Product Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openManualItemModal(productSearch)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              height: 40,
              padding: '0 14px',
              fontSize: 12.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
            title="Sell a product or service not in the product list"
          >
            <Plus size={15} />
            <span>Manual Product</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="pos-category-pills">
          <button
            className={`pos-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            All Products ({productList.length})
          </button>
          {categoriesList.map((cat) => (
            <button
              key={cat.category_id}
              className={`pos-pill ${selectedCategory === cat.category_id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.category_id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="pos-product-grid">
          {filteredProducts.map((p) => {
            const stock = Number(p.stock_quantity) || 0;
            const isOut = stock === 0;
            const inCart = cartItems.find((i) => i.product_id === p.product_id);

            return (
              <button
                key={p.product_id}
                className={`pos-product-card ${isOut ? 'out-of-stock' : ''}`}
                onClick={() => !isOut && handleProductCardClick(p)}
                disabled={isOut}
                style={{
                  position: 'relative',
                  border: inCart ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                }}
              >
                {inCart && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'var(--primary)',
                      color: '#FFF',
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 12,
                    }}
                  >
                    {inCart.quantity} in cart
                  </span>
                )}
                <div>
                  <div style={{
                    fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)',
                    textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.04em',
                  }}>
                    {p.brand_name || 'Generic'}
                  </div>
                  <div className="pos-product-name">{p.name}</div>
                  <div className="pos-product-model">{p.model || p.category_name}</div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="pos-product-price">{formatCurrency(p.retail_price)}</div>
                  <div className="pos-product-stock">
                    {isOut ? (
                      <span className="badge badge-red" style={{ fontSize: 10 }}>Out of Stock</span>
                    ) : (
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>{stock} in stock</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state">
                <div className="empty-state-icon"><Search size={22} /></div>
                <h3>No products found</h3>
                <p>Can't find the product in the catalog? You can sell it as a manual entry.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 10 }}
                  onClick={() => openManualItemModal(productSearch)}
                >
                  <Plus size={14} /> Sell as Manual Product
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Maximum Height Cart Panel ── */}
      <div className="pos-cart">
        {/* Cart Top Bar with Clear Header, View Tabs & Actions */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color)',
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}>
          {/* View Mode Segmented Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setCartViewTab('items')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1.5px solid ${cartViewTab === 'items' ? 'var(--primary)' : 'var(--border-color)'}`,
                background: cartViewTab === 'items' ? 'var(--primary-light)' : '#FFF',
                color: cartViewTab === 'items' ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ShoppingCart size={15} />
              <span>Cart Items</span>
              <span
                style={{
                  fontSize: 11,
                  background: cartViewTab === 'items' ? 'var(--primary)' : 'var(--neutral-surface)',
                  color: cartViewTab === 'items' ? '#FFF' : 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 800,
                }}
              >
                {cartItems.length}
              </span>
            </button>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAmountPaid(grandTotal);
                  setCartViewTab('payment');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${cartViewTab === 'payment' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: cartViewTab === 'payment' ? 'var(--primary-light)' : '#FFF',
                  color: cartViewTab === 'payment' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <CreditCard size={15} />
                <span>Pay ({formatCurrency(grandTotal)})</span>
              </button>
            )}
          </div>

          {/* Quick Header Utility Actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {cartItems.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFullCartModalOpen(true)}
                  title="Expand Full Cart Details View"
                  style={{ fontSize: 11.5, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Maximize2 size={13} /> Full View
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetPOS}
                  title="Clear all cart items"
                  style={{ fontSize: 11.5, padding: '4px 8px', color: 'var(--danger)' }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Compact Customer Selector Bar */}
        <div style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--neutral-surface)',
        }}>
          {customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="user-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                {initials(customer.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy-dark)' }}>{customer.name}</span>
                {customer.phone && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({customer.phone})</span>}
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setCustomer(null)}
                style={{ padding: 2 }}
                title="Remove customer"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: 30, paddingRight: 8, height: 32, fontSize: 11.5 }}
                placeholder="Walk-in Customer (search registered name/phone)..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <User size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              {customerResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: '#FFFFFF', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                  zIndex: 60, overflow: 'hidden',
                }}>
                  {customerResults.map((c) => (
                    <div
                      key={c.customer_id}
                      style={{
                        padding: '8px 12px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)', fontSize: 12,
                      }}
                      onMouseDown={() => { setCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════
            VIEW MODE 1: CART ITEMS (MAXIMUM HEIGHT)
        ═════════════════════════════════════════════ */}
        {cartViewTab === 'items' && (
          <>
            {/* Scrollable Products List with Extra Height & Big Cards */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 12px',
                background: 'var(--neutral-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {cartItems.length === 0 ? (
                <div className="empty-state" style={{ padding: '60px 20px', background: '#FFF', borderRadius: 'var(--radius-md)' }}>
                  <div className="empty-state-icon"><ShoppingCart size={32} /></div>
                  <h3 style={{ fontSize: 16 }}>Cart is Empty</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 280, margin: '6px auto 0' }}>
                    Click any product on the left catalog to enter quantity and add it to this sale order
                  </p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="pos-cart-item-card"
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--border-color)',
                      padding: '12px 14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Top Row: Index, Name, Brand & Line Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                        <span className="cart-item-index">#{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: 'var(--navy-dark)',
                              lineHeight: 1.3,
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 6,
                            }}
                            title={item.name}
                          >
                            <span>{item.name}</span>
                            {item.is_custom && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: '#EDE9FE',
                                  color: '#6D28D9',
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                }}
                              >
                                Manual Product
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {item.is_custom ? (item.model || 'Manual Entry') : (item.model || item.brand)}
                            {!item.is_custom && item.max_stock && (
                              <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>
                                (Avail: {item.max_stock})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy-dark)' }}>
                          {formatCurrency(item.unit_price * item.quantity - item.discount)}
                        </div>
                        {Number(item.discount) > 0 && (
                          <span className="badge badge-amber" style={{ fontSize: 10, padding: '1px 5px', marginTop: 2 }}>
                            - {formatCurrency(item.discount)} disc
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Stepper Controls, Unit Price, Edit & Remove */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Interactive Quantity Stepper */}
                        <div className="cart-qty-stepper">
                          <button
                            type="button"
                            className="qty-step-btn"
                            onClick={() => updateQty(idx, -1)}
                            title="Decrease quantity"
                            style={{ width: 30, height: 28 }}
                          >
                            <Minus size={11} />
                          </button>
                          <button
                            type="button"
                            className="qty-display-btn"
                            onClick={() => handleEditCartItem(idx)}
                            title="Click to edit quantity or price"
                            style={{ padding: '3px 10px', fontSize: 13, minWidth: 32 }}
                          >
                            {item.quantity}
                          </button>
                          <button
                            type="button"
                            className="qty-step-btn"
                            onClick={() => updateQty(idx, 1)}
                            title="Increase quantity"
                            style={{ width: 30, height: 28 }}
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          @ {formatCurrency(item.unit_price)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleEditCartItem(idx)}
                          style={{ fontSize: 11, color: 'var(--primary)', padding: '2px 6px', height: 26 }}
                          title="Edit quantity / discount"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeItem(idx)}
                          style={{ fontSize: 11, color: 'var(--danger)', padding: '2px 6px', height: 26 }}
                          title="Remove item"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Streamlined Bottom Order Total Bar */}
            <div
              style={{
                padding: '12px 16px',
                background: '#FFFFFF',
                borderTop: '1px solid var(--border-color)',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Order Total ({cartItems.length} items · {totalUnits} pcs)
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)', marginTop: 1 }}>
                    {formatCurrency(grandTotal)}
                  </div>
                </div>

                {/* Quick Discount Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Discount:</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: 85, height: 32, padding: '2px 8px', fontSize: 12, textAlign: 'right' }}
                    value={invoiceDiscount || ''}
                    onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Action Buttons: Quick Cash & Proceed to Payment */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleQuickCashSale}
                  disabled={!canCheckout || loading}
                  style={{
                    flex: 1,
                    height: 42,
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  title="Complete sale immediately with exact cash"
                >
                  <Banknote size={15} /> Quick Cash
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAmountPaid(grandTotal);
                    setCartViewTab('payment');
                  }}
                  disabled={!canCheckout}
                  style={{
                    flex: 1.4,
                    height: 42,
                    fontSize: 13,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  Pay {formatCurrency(grandTotal)} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═════════════════════════════════════════════
            VIEW MODE 2: PAYMENT & SETTLEMENT
        ═════════════════════════════════════════════ */}
        {cartViewTab === 'payment' && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              background: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Back to Items Link & Total Reminder */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 12,
                marginBottom: 14,
                borderBottom: '1px solid var(--border-color)',
              }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCartViewTab('items')}
                  style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ChevronLeft size={15} /> Back to Products ({cartItems.length})
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Settlement
                </span>
              </div>

              {/* Order Total Highlight Box */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Payable Amount
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Subtotal: {formatCurrency(subtotal)} {Number(invoiceDiscount) > 0 && `· Disc: -${formatCurrency(invoiceDiscount)}`}
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy-dark)' }}>
                  {formatCurrency(grandTotal)}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                  textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6,
                }}>
                  Payment Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      style={{
                        padding: '9px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${paymentMethod === pm.id ? 'var(--primary)' : 'var(--border-color)'}`,
                        background: paymentMethod === pm.id ? 'var(--primary-light)' : '#FFFFFF',
                        color: paymentMethod === pm.id ? 'var(--primary)' : 'var(--text-primary)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <pm.icon size={15} />
                      <span>{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Tendered with Quick Fill & Preset Chips */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Amount Tendered
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '1px 6px', color: 'var(--primary)', fontWeight: 700 }}
                    onClick={() => setAmountPaid(grandTotal)}
                  >
                    Exact Amount
                  </button>
                </div>

                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: 18, fontWeight: 800, textAlign: 'right', marginBottom: 8 }}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={formatCurrency(grandTotal)}
                />

                {/* Quick Cash Chips */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="quick-tender-chip"
                    onClick={() => setAmountPaid(grandTotal)}
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    className="quick-tender-chip"
                    onClick={() => handleAddTender(1000)}
                  >
                    +1,000
                  </button>
                  <button
                    type="button"
                    className="quick-tender-chip"
                    onClick={() => handleAddTender(5000)}
                  >
                    +5,000
                  </button>
                  <button
                    type="button"
                    className="quick-tender-chip"
                    onClick={() => handleAddTender(10000)}
                  >
                    +10,000
                  </button>
                </div>

                {tendered > 0 && change >= 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)',
                    fontSize: 13.5, fontWeight: 800, color: 'var(--success)', marginTop: 6,
                  }}>
                    <span>Change Due:</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
                {outstanding > 0 && tendered > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)',
                    fontSize: 12.5, color: 'var(--danger)', fontWeight: 700, marginTop: 6,
                  }}>
                    <span>Outstanding Balance:</span>
                    <span>{formatCurrency(outstanding)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Sale Action */}
            <div style={{ paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
              <button
                className="btn btn-primary btn-full btn-lg"
                disabled={!canCheckout || loading}
                onClick={handleCheckout}
                style={{ height: 46, fontSize: 14, fontWeight: 800 }}
              >
                {loading ? (
                  <><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Processing…</>
                ) : (
                  <><CheckCircle size={18} /> Confirm & Complete Sale ({formatCurrency(grandTotal)})</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════
          QUANTITY & AMOUNT POPUP MODAL
      ═════════════════════════════════════════════ */}
      {quantityModalOpen && modalProduct && (
        <div
          className="modal-overlay"
          style={{ zIndex: 120 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuantityModalOpen(false);
          }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 460,
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--neutral-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={18} color="var(--primary)" />
                <h3 className="modal-title" style={{ fontSize: 15.5 }}>
                  {editingCartIndex !== null ? 'Update Cart Quantity' : 'Add Product to Cart'}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setQuantityModalOpen(false)}
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmQuantityModal} style={{ padding: 22 }}>
              {/* Product Info Box */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  border: '1px solid #BFDBFE',
                  marginBottom: 18,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {modalProduct.brand_name || 'Brand'}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy-dark)', marginTop: 2 }}>
                      {modalProduct.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {modalProduct.model && <span>Model: {modalProduct.model} · </span>}
                      <span>Retail Price: {formatCurrency(modalProduct.retail_price)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-green" style={{ fontSize: 11 }}>
                      {modalProduct.stock_quantity} in stock
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Input with Stepper */}
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Enter Quantity (Available: {modalProduct.stock_quantity})
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => setModalQty((q) => Math.max(1, (parseInt(q, 10) || 1) - 1))}
                    style={{ width: 44, height: 44, fontSize: 18 }}
                  >
                    -
                  </button>
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    max={modalProduct.stock_quantity}
                    className="form-input"
                    value={modalQty}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        setModalQty('');
                      } else {
                        const num = parseInt(v, 10) || 1;
                        setModalQty(Math.min(Math.max(1, num), Number(modalProduct.stock_quantity) || 1));
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 44,
                      fontSize: 22,
                      fontWeight: 800,
                      textAlign: 'center',
                      color: 'var(--navy-dark)',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() =>
                      setModalQty((q) =>
                        Math.min(Number(modalProduct.stock_quantity) || 1, (parseInt(q, 10) || 0) + 1)
                      )
                    }
                    style={{ width: 44, height: 44, fontSize: 18 }}
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {[1, 2, 3, 5, 10].map((num) => {
                    const isOver = num > (Number(modalProduct.stock_quantity) || 0);
                    const isSelected = Number(modalQty) === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isOver}
                        onClick={() => setModalQty(num)}
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 16,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: isSelected ? 'var(--primary-light)' : '#FFF',
                          color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                          opacity: isOver ? 0.4 : 1,
                          cursor: isOver ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                  {Number(modalProduct.stock_quantity) > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalQty(modalProduct.stock_quantity)}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 16,
                        border: `1.5px solid ${
                          Number(modalQty) === Number(modalProduct.stock_quantity)
                            ? 'var(--primary)'
                            : 'var(--border-color)'
                        }`,
                        background:
                          Number(modalQty) === Number(modalProduct.stock_quantity)
                            ? 'var(--primary-light)'
                            : '#FFF',
                        color:
                          Number(modalQty) === Number(modalProduct.stock_quantity)
                            ? 'var(--primary)'
                            : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Max ({modalProduct.stock_quantity})
                    </button>
                  )}
                </div>
              </div>

              {/* Price & Discount Adjustment (Optional Overrides) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Unit Price (LKR)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ marginTop: 4, fontWeight: 600 }}
                    value={modalUnitPrice}
                    onChange={(e) => setModalUnitPrice(e.target.value)}
                    placeholder={String(modalProduct.retail_price)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Line Discount (LKR)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ marginTop: 4, fontWeight: 600 }}
                    value={modalDiscount || ''}
                    onChange={(e) => setModalDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Live Summary Calculation Box */}
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--neutral-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Line Total
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {modalQty || 1} × {formatCurrency(modalUnitPrice || modalProduct.retail_price)}
                    {Number(modalDiscount) > 0 && ` - ${formatCurrency(modalDiscount)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--navy-dark)' }}>
                    {formatCurrency(modalLineTotal)}
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={() => setQuantityModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  style={{ fontWeight: 700 }}
                >
                  <Check size={16} />
                  {editingCartIndex !== null ? 'Update Cart' : `Add ${formatCurrency(modalLineTotal)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════
          FULL CART DETAILS VIEW MODAL (EXPANDED VIEW)
      ═════════════════════════════════════════════ */}
      {fullCartModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div
            className="modal"
            style={{
              maxWidth: 840,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--neutral-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: 16 }}>
                    Sale Order Details — Full Cart View
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {cartItems.length} line items · {totalUnits} total units · Customer: {customer?.name || 'Walk-in Customer'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setFullCartModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              <div className="table-wrapper" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Product Description</th>
                      <th>Model / SKU</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'center', width: 140 }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Discount</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center', width: 80 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--navy-dark)' }}>{item.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{item.brand}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.model || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.unit_price)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => updateQty(idx, -1)}
                            >
                              <Minus size={11} />
                            </button>
                            <span style={{ fontWeight: 800, minWidth: 24, fontSize: 14 }}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => updateQty(idx, 1)}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', color: Number(item.discount) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {Number(item.discount) > 0 ? formatCurrency(item.discount) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy-dark)' }}>
                          {formatCurrency(item.unit_price * item.quantity - item.discount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => {
                                setFullCartModalOpen(false);
                                handleEditCartItem(idx);
                              }}
                              title="Edit item"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => removeItem(idx)}
                              style={{ color: 'var(--danger)' }}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Totals Summary */}
              <div
                style={{
                  background: 'var(--neutral-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Customer: <strong style={{ color: 'var(--navy-dark)' }}>{customer?.name || 'Walk-in Customer'}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Subtotal: {formatCurrency(subtotal)} · Invoice Discount: {formatCurrency(invoiceDiscount)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Grand Total</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>
                    {formatCurrency(grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '14px 24px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--neutral-surface)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFullCartModalOpen(false)}
              >
                Back to Register
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFullCartModalOpen(false);
                  setCartViewTab('payment');
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Manual / Custom Product Entry Modal ── */}
      {manualModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div
            className="modal"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              className="modal-header"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--neutral-surface)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 className="modal-title" style={{ fontSize: 16, fontWeight: 800 }}>
                  {editingManualIndex !== null ? 'Edit Manual Product' : 'Add Manual Product'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Sell a product, accessory, or service not in the product list
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setManualModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddManualItem}>
              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Product Name */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', display: 'block', marginBottom: 6 }}>
                    Product / Item Name <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    ref={manualNameInputRef}
                    type="text"
                    className="form-input"
                    placeholder="e.g. Generic Case, Screen Guard, Repair Service..."
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    required
                    style={{ fontSize: 14 }}
                  />
                </div>

                {/* Price and Quantity row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', display: 'block', marginBottom: 6 }}>
                      Unit Price (LKR) <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.00"
                      min="0"
                      step="any"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      required
                      style={{ fontSize: 15, fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', display: 'block', marginBottom: 6 }}>
                      Quantity <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        style={{ height: 38, width: 38 }}
                        disabled={manualQty <= 1}
                        onClick={() => setManualQty((q) => Math.max(1, q - 1))}
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={manualQty}
                        onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, height: 38 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        style={{ height: 38, width: 38 }}
                        onClick={() => setManualQty((q) => q + 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discount and Note row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', display: 'block', marginBottom: 6 }}>
                      Item Discount (LKR)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.00"
                      min="0"
                      value={manualDiscount || ''}
                      onChange={(e) => setManualDiscount(Number(e.target.value) || 0)}
                      style={{ fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-dark)', display: 'block', marginBottom: 6 }}>
                      Model / Note (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Color / Warranty note"
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </div>

                {/* Subtotal Preview Banner */}
                <div
                  style={{
                    background: 'var(--neutral-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    Item Total ({manualQty} unit{manualQty > 1 ? 's' : ''}):
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>
                    {formatCurrency(Math.max(0, (Number(manualPrice) || 0) * (Number(manualQty) || 1) - (Number(manualDiscount) || 0)))}
                  </span>
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--neutral-surface)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setManualModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!manualName.trim() || manualPrice === '' || Number(manualPrice) < 0}
                >
                  <Plus size={14} /> {editingManualIndex !== null ? 'Update Item' : 'Add to Cart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}