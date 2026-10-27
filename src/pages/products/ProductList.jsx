// src/pages/products/ProductList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Package, Edit2, Eye, AlertTriangle, Trash2 } from 'lucide-react';
import { products, categories, brands } from '../../services/api.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 20;

export default function ProductList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productList, setProductList] = useState([]);
  const [cats, setCats] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const q = searchParams.get('q') || '';
  const cat = searchParams.get('category_id') || '';
  const brand = searchParams.get('brand_id') || '';
  const lowStock = searchParams.get('low_stock') === 'true';
  const outOfStock = searchParams.get('out_of_stock') === 'true';

  useEffect(() => {
    Promise.all([
      categories.list({ active_only: true }),
      brands.list({ active_only: true }),
    ]).then(([cRes, bRes]) => {
      setCats(cRes.data.data.categories);
      setBrandList(bRes.data.data.brands);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    products.list({ q, category_id: cat, brand_id: brand, low_stock: lowStock, out_of_stock: outOfStock })
      .then((res) => setProductList(res.data.data.products))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [q, cat, brand, lowStock, outOfStock]);

  const paginated = productList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(productList.length / PAGE_SIZE);

  const setFilter = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
    setSearchParams(p);
    setPage(1);
  };

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${p.name}"?`)) return;
    try {
      await products.delete(p.product_id);
      toast.success('Product removed successfully');
      setProductList((prev) => prev.filter((item) => item.product_id !== p.product_id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{productList.length} products total</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('/products/new')}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={clsx('badge', lowStock ? 'badge-amber' : 'badge-gray')}
          style={{ cursor: 'pointer', border: 'none' }}
          onClick={() => setFilter('low_stock', lowStock ? '' : 'true')}
        >
          <AlertTriangle size={12} /> Low Stock
        </button>
        <button
          className={clsx('badge', outOfStock ? 'badge-red' : 'badge-gray')}
          style={{ cursor: 'pointer', border: 'none' }}
          onClick={() => setFilter('out_of_stock', outOfStock ? '' : 'true')}
        >
          Out of Stock
        </button>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search name, model, SKU, barcode…"
              value={q}
              onChange={(e) => setFilter('q', e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 180 }}
            value={cat}
            onChange={(e) => setFilter('category_id', e.target.value)}
          >
            <option value="">All Categories</option>
            {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
          </select>

          <select
            className="form-select"
            style={{ width: 160 }}
            value={brand}
            onChange={(e) => setFilter('brand_id', e.target.value)}
          >
            <option value="">All Brands</option>
            {brandList.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category / Brand</th>
                <th>SKU</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: '80%' }} /></td>
                  ))}
                </tr>
              ))}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon"><Package size={28} /></div>
                      <h3>No products found</h3>
                      <p>Try adjusting your search or filters, or add a new product.</p>
                      <button className="btn btn-primary" onClick={() => navigate('/products/new')}>
                        <Plus size={15} /> Add Product
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && paginated.map((p) => {
                const qty = Number(p.stock_quantity) || 0;
                const minQty = Number(p.min_stock_level) || 0;
                const isLow = qty <= minQty && minQty > 0;
                const isOut = qty === 0;
                return (
                  <tr key={p.product_id} onClick={() => navigate(`/products/${p.product_id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{p.model}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{p.category_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{p.brand_name}</div>
                    </td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{p.sku || '—'}</td>
                    <td>{formatCurrency(p.purchase_cost)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.retail_price)}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: isOut ? 'var(--danger-600)' : isLow ? 'var(--warning-600)' : 'var(--success-600)',
                      }}>
                        {qty}
                      </span>
                      {isLow && !isOut && <AlertTriangle size={12} style={{ marginLeft: 4, color: 'var(--warning-500)', verticalAlign: 'middle' }} />}
                    </td>
                    <td>
                      <span className={`badge ${p.is_active !== 'false' ? 'badge-green' : 'badge-gray'}`}>
                        {p.is_active !== 'false' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => navigate(`/products/${p.product_id}`)}>
                          <Eye size={15} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => navigate(`/products/${p.product_id}/edit`)}>
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: 'var(--danger)' }}
                          title="Delete Product"
                          onClick={() => handleDeleteProduct(p)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span className="pagination-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, productList.length)} of {productList.length}
            </span>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button key={p} className={clsx('page-btn', { active: p === page })} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>
    </div>
  );
}
