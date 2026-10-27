// src/pages/settings/Settings.jsx
import React, { useState, useEffect } from 'react';
import { Save, Store, Receipt, Sliders, Database, CheckCircle2, Shield } from 'lucide-react';
import { settings as settingsApi } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('shop');

  const [form, setForm] = useState({
    shop_name: '4N Planet',
    shop_address: '',
    shop_phone: '',
    shop_email: '',
    shop_website: '',
    currency: 'LKR',
    currency_symbol: 'Rs.',
    timezone: 'Asia/Colombo',
    tax_enabled: 'false',
    tax_rate: '0',
    tax_label: 'VAT',
    receipt_footer: 'Thank you for shopping at 4N Planet! Please retain your receipt for warranty claims.',
    warranty_disclaimer: 'Warranty covers manufacturer defects only. Physical and water damage are excluded.',
    low_stock_threshold: '5',
    allow_negative_stock: 'false',
    max_discount_percent: '15',
    manager_discount_limit: '30',
    invoice_prefix: 'INV',
    po_prefix: 'PO',
    job_prefix: 'JOB',
  });

  useEffect(() => {
    settingsApi.get()
      .then((res) => {
        if (res.data.data?.settings) {
          setForm((prev) => ({ ...prev, ...res.data.data.settings }));
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(form);
      toast.success('Settings updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p>Loading shop settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Settings</h1>
          <p className="page-subtitle">Configure business profile, receipt headers, tax rules, and operational parameters</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          <Store size={16} /> Business Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <Receipt size={16} /> POS & Invoicing
        </button>
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Sliders size={16} /> Inventory & Policy
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Business Profile */}
        {activeTab === 'shop' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Store Identity & Contact</h2>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Shop / Business Name *</label>
                <input
                  type="text"
                  name="shop_name"
                  className="form-input"
                  value={form.shop_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Store Hotline / Phone</label>
                <input
                  type="text"
                  name="shop_phone"
                  className="form-input"
                  placeholder="e.g. +94 11 234 5678"
                  value={form.shop_phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  name="shop_email"
                  className="form-input"
                  placeholder="e.g. info@4nplanet.lk"
                  value={form.shop_email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Shop Address</label>
                <textarea
                  name="shop_address"
                  className="form-input"
                  rows={2}
                  placeholder="e.g. No. 123, Galle Road, Colombo 03, Sri Lanka"
                  value={form.shop_address}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency Code</label>
                <input
                  type="text"
                  name="currency"
                  className="form-input"
                  value={form.currency}
                  onChange={handleChange}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency Symbol</label>
                <input
                  type="text"
                  name="currency_symbol"
                  className="form-input"
                  value={form.currency_symbol}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* POS & Invoicing */}
        {activeTab === 'pos' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Receipt & Invoice Customization</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-3" style={{ gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Invoice Prefix</label>
                  <input
                    type="text"
                    name="invoice_prefix"
                    className="form-input"
                    value={form.invoice_prefix}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Order Prefix</label>
                  <input
                    type="text"
                    name="po_prefix"
                    className="form-input"
                    value={form.po_prefix}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Repair Job Prefix</label>
                  <input
                    type="text"
                    name="job_prefix"
                    className="form-input"
                    value={form.job_prefix}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 16 }}>
                <div className="form-group">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 24 }}>
                    <input
                      type="checkbox"
                      name="tax_enabled"
                      checked={form.tax_enabled === 'true'}
                      onChange={handleChange}
                    />
                    <span style={{ fontWeight: 600 }}>Enable Tax / VAT at Checkout</span>
                  </label>
                </div>
                {form.tax_enabled === 'true' && (
                  <div className="form-group">
                    <label className="form-label">Tax Rate (%)</label>
                    <input
                      type="number"
                      name="tax_rate"
                      step="0.1"
                      min="0"
                      className="form-input"
                      value={form.tax_rate}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Footer Note</label>
                <textarea
                  name="receipt_footer"
                  className="form-input"
                  rows={2}
                  value={form.receipt_footer}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Warranty Disclaimer on Invoices</label>
                <textarea
                  name="warranty_disclaimer"
                  className="form-input"
                  rows={2}
                  value={form.warranty_disclaimer}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* Inventory & Policy */}
        {activeTab === 'inventory' && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Inventory Alerts & Policy Controls</h2>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Default Low Stock Alert Threshold</label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  min="0"
                  className="form-input"
                  value={form.low_stock_threshold}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Cashier Discount Limit (%)</label>
                <input
                  type="number"
                  name="max_discount_percent"
                  min="0"
                  max="100"
                  className="form-input"
                  value={form.max_discount_percent}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="allow_negative_stock"
                    checked={form.allow_negative_stock === 'true'}
                    onChange={handleChange}
                  />
                  <span>Allow negative inventory on non-serialized items during POS checkout</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 40 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
