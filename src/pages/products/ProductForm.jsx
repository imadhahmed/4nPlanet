// src/pages/products/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, AlertCircle } from 'lucide-react';
import { products, categories, brands, suppliers } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [catList, setCatList] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [supplierList, setSupplierList] = useState([]);

  const [form, setForm] = useState({
    name: '',
    brand_id: '',
    category_id: '',
    subcategory_id: '',
    model: '',
    sku: '',
    barcode: '',
    description: '',
    supplier_id: '',
    purchase_cost: '',
    selling_price: '',
    wholesale_price: '',
    min_price: '',
    stock_quantity: 0,
    min_stock_level: 5,
    is_serialized: 'false',
    warranty_months: 12,
    is_active: 'true',
  });

  useEffect(() => {
    Promise.all([
      categories.list({ active_only: true }),
      brands.list({ active_only: true }),
      suppliers.list({ active_only: true }),
    ])
      .then(([cRes, bRes, sRes]) => {
        setCatList(cRes.data.data.categories || []);
        setBrandList(bRes.data.data.brands || []);
        setSupplierList(sRes.data.data.suppliers || []);
      })
      .catch(() => toast.error('Failed to load form options'));

    if (isEdit) {
      products.get(id)
        .then((res) => {
          const p = res.data.data.product;
          setForm({
            name: p.name || '',
            brand_id: p.brand_id || '',
            category_id: p.category_id || '',
            subcategory_id: p.subcategory_id || '',
            model: p.model || '',
            sku: p.sku || '',
            barcode: p.barcode || '',
            description: p.description || '',
            supplier_id: p.supplier_id || '',
            purchase_cost: p.purchase_cost ?? '',
            selling_price: p.retail_price ?? p.selling_price ?? '',
            wholesale_price: p.wholesale_price ?? '',
            min_price: p.min_price ?? '',
            stock_quantity: p.stock_quantity ?? 0,
            min_stock_level: p.min_stock_level ?? 5,
            is_serialized: 'false',
            warranty_months: p.warranty_months ?? p.warranty_duration ?? 12,
            is_active: String(p.is_active) !== 'false' ? 'true' : 'false',
          });
        })
        .catch(() => {
          toast.error('Failed to load product details');
          navigate('/products');
        })
        .finally(() => setFetching(false));
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value,
    }));
  };

  const generateSKU = () => {
    const prefix = form.name ? form.name.substring(0, 3).toUpperCase() : 'PRD';
    const random = Math.floor(1000 + Math.random() * 9000);
    setForm((prev) => ({ ...prev, sku: `${prefix}-${random}` }));
  };

  const generateBarcode = () => {
    const code = '4N' + Math.floor(1000000000 + Math.random() * 9000000000);
    setForm((prev) => ({ ...prev, barcode: code }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Product name is required');
    if (!form.category_id) return toast.error('Please select a category');
    if (!form.brand_id) return toast.error('Please select a brand');
    if (form.purchase_cost === '' || Number(form.purchase_cost) < 0) {
      return toast.error('Valid purchase cost is required');
    }
    if (form.selling_price === '' || Number(form.selling_price) < 0) {
      return toast.error('Valid selling price is required');
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand_id: form.brand_id,
        category_id: form.category_id,
        subcategory_id: form.subcategory_id || '',
        model: form.model || '',
        sku: form.sku || '',
        barcode: form.barcode || '',
        description: form.description || '',
        supplier_id: form.supplier_id || '',
        purchase_cost: Number(form.purchase_cost) || 0,
        retail_price: Number(form.selling_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : 0,
        min_price: form.min_price ? Number(form.min_price) : 0,
        stock_quantity: Number(form.stock_quantity) || 0,
        min_stock_level: Number(form.min_stock_level) || 0,
        warranty_duration: String(form.warranty_months || 0),
        warranty_months: Number(form.warranty_months) || 0,
        is_serialized: false,
        is_active: form.is_active === 'true' || form.is_active === true,
      };

      if (isEdit) {
        await products.update(id, payload);
        toast.success('Product updated successfully');
      } else {
        await products.create(payload);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p>Loading product details...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/products')} type="button">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
            <p className="page-subtitle">
              {isEdit ? 'Update details, pricing, and stock levels' : 'Enter mobile device or accessory specifications'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Basic Information</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Apple iPhone 15 Pro Max 256GB"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category_id"
                className="form-select"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Category</option>
                {catList.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Brand *</label>
              <select
                name="brand_id"
                className="form-select"
                value={form.brand_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Brand</option>
                {brandList.map((b) => (
                  <option key={b.brand_id} value={b.brand_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Model Number / Variant</label>
              <input
                type="text"
                name="model"
                className="form-input"
                placeholder="e.g. A3106 / Titanium Blue"
                value={form.model}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Primary Supplier</label>
              <select
                name="supplier_id"
                className="form-select"
                value={form.supplier_id}
                onChange={handleChange}
              >
                <option value="">Select Supplier (Optional)</option>
                {supplierList.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">SKU</label>
                <button type="button" className="btn-link" onClick={generateSKU} style={{ fontSize: 12 }}>
                  <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Generate
                </button>
              </div>
              <input
                type="text"
                name="sku"
                className="form-input"
                placeholder="e.g. IPH-15P-256"
                value={form.sku}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Barcode</label>
                <button type="button" className="btn-link" onClick={generateBarcode} style={{ fontSize: 12 }}>
                  <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Generate
                </button>
              </div>
              <input
                type="text"
                name="barcode"
                className="form-input"
                placeholder="Scan or enter barcode"
                value={form.barcode}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Description & Specifications</label>
              <textarea
                name="description"
                className="form-input"
                rows={3}
                placeholder="Color, RAM/Storage, condition, specifications..."
                value={form.description}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Pricing & Stock */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Pricing & Stock Configuration</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Purchase Cost (LKR) *</label>
              <input
                type="number"
                name="purchase_cost"
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={form.purchase_cost}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Retail Selling Price (LKR) *</label>
              <input
                type="number"
                name="selling_price"
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={form.selling_price}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Wholesale Price (LKR)</label>
              <input
                type="number"
                name="wholesale_price"
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={form.wholesale_price}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Selling Price (Floor)</label>
              <input
                type="number"
                name="min_price"
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={form.min_price}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Stock Quantity *</label>
              <input
                type="number"
                name="stock_quantity"
                className="form-input"
                min="0"
                value={form.stock_quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Alert Level</label>
              <input
                type="number"
                name="min_stock_level"
                className="form-input"
                min="0"
                value={form.min_stock_level}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Warranty Period (Months)</label>
              <input
                type="number"
                name="warranty_months"
                className="form-input"
                min="0"
                value={form.warranty_months}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active === 'true'}
                  onChange={handleChange}
                />
                <span>Active for Sale & POS</span>
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 40 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
