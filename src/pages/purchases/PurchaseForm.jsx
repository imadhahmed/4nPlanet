// src/pages/purchases/PurchaseForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, ShoppingCart, Smartphone, Calculator } from 'lucide-react';
import { purchases as purchasesApi, suppliers as suppliersApi, products as productsApi } from '../../services/api.js';
import { formatCurrency, todayISO } from '../../utils/format.js';
import toast from 'react-hot-toast';

export default function PurchaseForm() {
  const navigate = useNavigate();

  const [supplierList, setSupplierList] = useState([]);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [discount, setDiscount] = useState(0);
  const [additionalCosts, setAdditionalCosts] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Line items
  const [items, setItems] = useState([
    {
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      discount: 0,
      imei1: '',
      imei2: '',
      serial_number: '',
    },
  ]);

  useEffect(() => {
    Promise.all([
      suppliersApi.list({ active_only: true }),
      productsApi.list({ status: 'active' }),
    ])
      .then(([sRes, pRes]) => {
        setSupplierList(sRes.data.data.suppliers || []);
        setProductList(pRes.data.data.products || []);
      })
      .catch(() => toast.error('Failed to load suppliers or products'));
  }, []);

  const handleProductChange = (index, prodId) => {
    const prod = productList.find((p) => p.product_id === prodId);
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_id: prodId,
        unit_cost: prod ? Number(prod.purchase_cost) || 0 : 0,
      };
      return copy;
    });
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: '',
        quantity: 1,
        unit_cost: 0,
        discount: 0,
        imei1: '',
        imei2: '',
        serial_number: '',
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return toast.error('At least one item is required');
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unit_cost) || 0;
    const disc = Number(item.discount) || 0;
    return sum + (cost * qty - disc);
  }, 0);

  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(additionalCosts || 0));
  const outstandingBalance = Math.max(0, grandTotal - Number(amountPaid || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) return toast.error('Please select a supplier');
    if (!purchaseDate) return toast.error('Please choose purchase date');

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_id) return toast.error(`Item #${i + 1}: Select a product`);
      if (Number(it.quantity) <= 0) return toast.error(`Item #${i + 1}: Quantity must be > 0`);
      if (Number(it.unit_cost) < 0) return toast.error(`Item #${i + 1}: Cost cannot be negative`);

      if (it.is_serialized && !it.imei1.trim() && !it.serial_number.trim()) {
        return toast.error(`Item #${i + 1}: Serialized product requires IMEI 1 or Serial #`);
      }
    }

    setLoading(true);
    try {
      const payload = {
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        reference_number: referenceNumber,
        discount: Number(discount) || 0,
        additional_costs: Number(additionalCosts) || 0,
        amount_paid: Number(amountPaid) || 0,
        payment_method: paymentMethod,
        notes,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
          discount: Number(it.discount) || 0,
          imei1: it.imei1?.trim() || '',
          imei2: it.imei2?.trim() || '',
          serial_number: it.serial_number?.trim() || '',
        })),
      };

      const res = await purchasesApi.create(payload);
      toast.success('Purchase recorded successfully');
      navigate(`/purchases/${res.data.data.purchase.purchase_id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/purchases')} type="button">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">New Purchase / Goods Received (GRN)</h1>
            <p className="page-subtitle">Add supplier stock receipt and record IMEI/serials</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Supplier & Header Details */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Supplier & Order Details</h2>
          <div className="grid-3" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Supplier *</label>
              <select
                className="form-select"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select Supplier</option>
                {supplierList.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Purchase / GRN Date *</label>
              <input
                type="date"
                className="form-input"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier Invoice / Ref #</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. INV-98421"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Purchase Items */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Received Products</h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
              <Plus size={15} /> Add Line Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--blue-400)' }}>
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      style={{ color: 'var(--danger-600)' }}
                      onClick={() => removeItemRow(idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid-4" style={{ gap: 12, marginBottom: item.is_serialized ? 12 : 0 }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Product *</label>
                    <select
                      className="form-select"
                      value={item.product_id}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      required
                    >
                      <option value="">Select Product...</option>
                      {productList.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} {p.model ? `(${p.model})` : ''} — Current Cost: {formatCurrency(p.purchase_cost)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Unit Cost (LKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(idx, 'unit_cost', Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Totals & Payments */}
        <div className="grid-2" style={{ gap: 20, marginBottom: 30 }}>
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Payment & Notes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit / Payable</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Paid Upfront (LKR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={grandTotal}
                  className="form-input"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Order Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Terms, courier info, warranty slips..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Summary & Total</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items Subtotal:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount:</span>
                <div style={{ width: 120 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    style={{ textAlign: 'right', padding: '4px 8px' }}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shipping / Other:</span>
                <div style={{ width: 120 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    style={{ textAlign: 'right', padding: '4px 8px' }}
                    value={additionalCosts}
                    onChange={(e) => setAdditionalCosts(Number(e.target.value))}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '2px dashed var(--gray-300)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--blue-400)',
                }}
              >
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger-600)', fontWeight: 600 }}>
                <span>Outstanding Balance:</span>
                <span>{formatCurrency(outstandingBalance)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/purchases')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={16} /> {loading ? 'Recording...' : 'Record Purchase (GRN)'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
