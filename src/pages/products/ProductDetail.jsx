// src/pages/products/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Sliders, Box, Tag, ShieldCheck,
  TrendingUp, AlertTriangle, CheckCircle2, History, Smartphone
} from 'lucide-react';
import { products as productsApi } from '../../services/api.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Stock Adjust Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    adjustment_type: 'add',
    quantity: 1,
    reason: 'Inventory count correction',
    notes: '',
  });
  const [adjusting, setAdjusting] = useState(false);

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProduct = () => {
    setLoading(true);
    productsApi.get(id)
      .then((res) => {
        setProduct(res.data.data.product);
      })
      .catch(() => {
        toast.error('Failed to load product');
        navigate('/products');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) {
      return toast.error('Please enter a valid quantity');
    }

    setAdjusting(true);
    try {
      await productsApi.adjustStock(id, adjustForm);
      toast.success('Stock adjusted successfully');
      setShowAdjustModal(false);
      setAdjustForm({
        adjustment_type: 'add',
        quantity: 1,
        reason: 'Inventory count correction',
        notes: '',
      });
      fetchProduct();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.delete(id);
      toast.success('Product removed or deactivated');
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) return null;

  const cost = Number(product.purchase_cost) || 0;
  const price = Number(product.selling_price || product.retail_price) || 0;
  const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;
  const stock = Number(product.stock_quantity) || 0;
  const minStock = Number(product.min_stock_level) || 0;
  const isSerialized = String(product.is_serialized) === 'true';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/products')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="page-title">{product.name}</h1>
              <span className={clsx('badge', String(product.is_active) !== 'false' ? 'badge-green' : 'badge-gray')}>
                {String(product.is_active) !== 'false' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="page-subtitle">
              SKU: {product.sku || 'N/A'} • Barcode: {product.barcode || 'N/A'}
            </p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowAdjustModal(true)}>
            <Sliders size={16} /> Adjust Stock
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/products/${id}/edit`)}>
            <Edit2 size={16} /> Edit
          </button>
          <button className="btn btn-danger btn-icon" onClick={() => setShowDeleteModal(true)} title="Delete product">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <span className="kpi-label">Selling Price</span>
          <span className="kpi-value">{formatCurrency(price)}</span>
          <span className="kpi-sub" style={{ color: 'var(--success-600)' }}>
            Margin: {margin}%
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Purchase Cost</span>
          <span className="kpi-value">{formatCurrency(cost)}</span>
          <span className="kpi-sub">Wholesale: {formatCurrency(product.wholesale_price || 0)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Available Stock</span>
          <span className={clsx('kpi-value', stock === 0 ? 'text-danger' : stock <= minStock ? 'text-warning' : '')}>
            {stock} units
          </span>
          <span className="kpi-sub">Alert at &le; {minStock} units</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Warranty</span>
          <span className="kpi-value" style={{ fontSize: '1.2rem', marginTop: 4 }}>
            {product.warranty_months || product.warranty_duration || 0} Months
          </span>
          <span className="kpi-sub">Barcode: {product.barcode || '—'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={clsx('tab-btn', activeTab === 'overview' && 'active')}
          onClick={() => setActiveTab('overview')}
        >
          <Box size={16} /> Overview
        </button>

        <button
          className={clsx('tab-btn', activeTab === 'movements' && 'active')}
          onClick={() => setActiveTab('movements')}
        >
          <History size={16} /> Stock History ({product.movements?.length || 0})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Product Specifications</h2>
          <div className="grid-2" style={{ gap: 20 }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Brand</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{product.brand_name || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Category</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{product.category_name || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Model / Sub-variant</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{product.model || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Primary Supplier</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{product.supplier_name || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Minimum Selling Price Floor</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{formatCurrency(product.min_price || 0)}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Created / Registered</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{formatDate(product.created_at)}</p>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 6 }}>Description & Notes</p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {product.description || 'No description provided for this item.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab: Serials & IMEIs */}
      {activeTab === 'serials' && isSerialized && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Individual Device Serial / IMEI Inventory</h2>
            <span className="badge badge-blue">{product.serials?.length || 0} Total Units</span>
          </div>
          {(!product.serials || product.serials.length === 0) ? (
            <div className="empty-state">
              <Smartphone size={32} />
              <p>No serials registered yet. Add serialized stock through Purchases or Goods Received (GRN).</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>IMEI 1</th>
                    <th>IMEI 2 / Serial</th>
                    <th>Color / Spec</th>
                    <th>Status</th>
                    <th>Battery Health</th>
                  </tr>
                </thead>
                <tbody>
                  {product.serials.map((s, idx) => (
                    <tr key={s.serial_id || idx}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.imei1 || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{s.imei2 || s.serial_number || '—'}</td>
                      <td>{s.color || s.condition || '—'}</td>
                      <td>
                        <span className={clsx('badge', s.status === 'available' ? 'badge-green' : s.status === 'sold' ? 'badge-blue' : 'badge-amber')}>
                          {s.status}
                        </span>
                      </td>
                      <td>{s.battery_health ? `${s.battery_health}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Stock Movements */}
      {activeTab === 'movements' && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Stock Movement Ledger</h2>
          {(!product.movements || product.movements.length === 0) ? (
            <div className="empty-state">
              <History size={32} />
              <p>No stock movement logs recorded yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Balance</th>
                    <th>Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {product.movements.map((m, idx) => (
                    <tr key={m.movement_id || idx}>
                      <td>{formatDateTime(m.created_at)}</td>
                      <td>
                        <span className={clsx('badge', m.movement_type?.includes('in') ? 'badge-green' : 'badge-amber')}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.quantity}</td>
                      <td>{m.balance_after}</td>
                      <td>{m.reason} {m.notes ? `(${m.notes})` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock Adjust Modal */}
      {showAdjustModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Adjust Stock Quantity</h3>
              <button className="btn-close" onClick={() => setShowAdjustModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleStockAdjust}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-select"
                    value={adjustForm.adjustment_type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                  >
                    <option value="add">Add Stock (+)</option>
                    <option value="subtract">Deduct Stock (-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <select
                    className="form-select"
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  >
                    <option value="Inventory count correction">Inventory count correction</option>
                    <option value="Damaged / Defective stock">Damaged / Defective stock</option>
                    <option value="Internal shop use / Testing">Internal shop use / Testing</option>
                    <option value="Display demo unit">Display demo unit</option>
                    <option value="Supplier exchange">Supplier exchange</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Additional context..."
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={adjusting}>
                  {adjusting ? 'Adjusting...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove <strong>{product.name}</strong>?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                If this item has existing sales or purchase records, it will be deactivated to safeguard audit history instead of permanently wiped.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
