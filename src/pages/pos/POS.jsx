// src/pages/pos/POS.jsx — Point of Sale (Master UI Theme)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, X, User, Printer,
  CreditCard, Banknote, Smartphone, CheckCircle, ArrowRight,
  Tag, RotateCcw,
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

  const addToCart = (product) => {
    const stock = Number(product.stock_quantity) || 0;
    if (stock <= 0) {
      toast.error('This product is out of stock');
      return;
    }
    const existing = cartItems.find((i) => i.product_id === product.product_id);
    if (existing) {
      if (existing.quantity >= stock) {
        toast.error('Cannot exceed available stock');
        return;
      }
      setCartItems(cartItems.map((i) =>
        i.product_id === product.product_id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCartItems([...cartItems, {
        product_id: product.product_id,
        name: product.name,
        model: product.model,
        brand: product.brand_name,
        unit_price: Number(product.retail_price) || 0,
        purchase_cost: Number(product.purchase_cost) || 0,
        quantity: 1,
        discount: 0,
        serial_id: '',
        imei1: '',
        max_stock: stock,
        warranty_duration: product.warranty_duration || '',
      }]);
    }
  };

  const updateQty = (idx, delta) => {
    const item = cartItems[idx];
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (newQty > item.max_stock) {
      toast.error(`Cannot exceed available stock (${item.max_stock})`);
      return;
    }
    setCartItems(cartItems.map((it, i) => i === idx ? { ...it, quantity: newQty } : it));
  };

  const updatePrice = (idx, price) => {
    setCartItems(cartItems.map((it, i) => i === idx ? { ...it, unit_price: Number(price) || 0 } : it));
  };

  const updateDiscount = (idx, disc) => {
    setCartItems(cartItems.map((it, i) => i === idx ? { ...it, discount: Number(disc) || 0 } : it));
  };

  const removeItem = (idx) => {
    setCartItems(cartItems.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, i) => sum + (i.unit_price * i.quantity - i.discount), 0);
  const grandTotal = Math.max(0, subtotal - invoiceDiscount);
  const tendered = Number(amountPaid) || 0;
  const change = Math.max(0, tendered - grandTotal);
  const outstanding = Math.max(0, grandTotal - tendered);

  const canCheckout = cartItems.length > 0;

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

  const resetPOS = () => {
    setCartItems([]);
    setCustomer(null);
    setAmountPaid('');
    setInvoiceDiscount(0);
    setCompletedSale(null);
    setPage('pos');
    setProductSearch('');
    setSelectedCategory('ALL');
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

  return (
    <div className="pos-layout">
      {/* ── Left Column: Product Browser ── */}
      <div className="pos-products">
        {/* Search & Top Bar */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
          background: '#FFFFFF', display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search products by name, model, SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              autoFocus
            />
          </div>
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
            return (
              <button
                key={p.product_id}
                className={`pos-product-card ${isOut ? 'out-of-stock' : ''}`}
                onClick={() => !isOut && addToCart(p)}
                disabled={isOut}
              >
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
                <p>Try a different keyword or category filter</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Persistent Cart Panel ── */}
      <div className="pos-cart">
        {/* Customer Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
          background: 'var(--neutral-surface)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
          }}>
            Customer
          </div>
          {customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="user-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                {initials(customer.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-dark)' }}>{customer.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{customer.phone || 'No phone'}</div>
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setCustomer(null)}
                title="Remove customer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="search"
                className="form-input"
                style={{ paddingLeft: 34, fontSize: 12.5 }}
                placeholder="Walk-in Customer (or search name/phone)..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <User size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
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
                        padding: '9px 12px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)', fontSize: 12.5,
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

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cartItems.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon"><ShoppingCart size={24} /></div>
              <h3>Cart is Empty</h3>
              <p>Select products from the catalog to build this sale order</p>
            </div>
          ) : (
            cartItems.map((item, idx) => (
              <div key={idx} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-model">{item.model || item.brand}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Quantity controls */}
                    <div style={{
                      display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)', background: '#FFFFFF',
                    }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => updateQty(idx, -1)}
                        style={{ padding: '3px 6px' }}
                      >
                        <Minus size={11} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => updateQty(idx, 1)}
                        style={{ padding: '3px 6px' }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Unit price override */}
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 85, padding: '4px 8px', fontSize: 12 }}
                      value={item.unit_price}
                      title="Unit price"
                      onChange={(e) => updatePrice(idx, e.target.value)}
                    />

                    {/* Item discount */}
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 75, padding: '4px 8px', fontSize: 11.5 }}
                      placeholder="Disc."
                      title="Item discount"
                      value={item.discount || ''}
                      onChange={(e) => updateDiscount(idx, e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy-dark)' }}>
                    {formatCurrency(item.unit_price * item.quantity - item.discount)}
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => removeItem(idx)}
                    style={{ color: 'var(--danger)', marginTop: 4 }}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout Panel */}
        <div className="cart-totals">
          <div className="cart-total-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="cart-total-row" style={{ alignItems: 'center' }}>
            <span>Invoice Discount</span>
            <input
              type="number"
              className="form-input"
              style={{ width: 90, padding: '3px 8px', fontSize: 12 }}
              value={invoiceDiscount || ''}
              onChange={(e) => setInvoiceDiscount(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="cart-total-row grand">
            <span>Grand Total</span>
            <span style={{ color: 'var(--primary)' }}>{formatCurrency(grandTotal)}</span>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
            }}>
              Payment Method
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 10 }}>
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  style={{
                    padding: '7px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${paymentMethod === pm.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: paymentMethod === pm.id ? 'var(--primary-light)' : '#FFFFFF',
                    color: paymentMethod === pm.id ? 'var(--primary)' : 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <pm.icon size={14} />
                  <span>{pm.label}</span>
                </button>
              ))}
            </div>

            {/* Amount Tendered with Quick Fill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Amount Tendered
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '1px 6px', color: 'var(--primary)' }}
                onClick={() => setAmountPaid(grandTotal)}
              >
                Exact Amount
              </button>
            </div>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: 16, fontWeight: 700, textAlign: 'right', marginBottom: 8 }}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={formatCurrency(grandTotal)}
            />

            {tendered > 0 && change >= 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                <span>Change Due</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
            {outstanding > 0 && tendered > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5, color: 'var(--danger)', fontWeight: 600 }}>
                <span>Outstanding Balance</span>
                <span>{formatCurrency(outstanding)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={!canCheckout || loading}
            onClick={handleCheckout}
            style={{ marginTop: 6 }}
          >
            {loading ? (
              <><div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Processing…</>
            ) : (
              <><CheckCircle size={17} /> Complete Sale</>
            )}
          </button>

          {cartItems.length > 0 && (
            <button
              className="btn btn-ghost btn-full btn-sm"
              onClick={resetPOS}
              style={{ marginTop: 4, color: 'var(--text-secondary)' }}
            >
              <RotateCcw size={13} />
              <span>Clear Cart</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
