// src/pages/sales/SaleDetail.jsx — Invoice view + print
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Package, User, Calendar, CreditCard, AlertCircle, Trash2 } from 'lucide-react';
import { sales as salesApi } from '../../services/api.js';
import { formatCurrency, formatDate, formatDateTime, paymentStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([salesApi.get(id), salesApi.items(id)])
      .then(([sRes, iRes]) => {
        setSale(sRes.data.data.sale);
        setItems(iRes.data.data.items || []);
      })
      .catch(() => toast.error('Failed to load sale'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDeleteSale = async () => {
    setDeleting(true);
    try {
      await salesApi.delete(id);
      toast.success('Sale cancelled/deleted and inventory restored');
      navigate('/sales');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel/delete sale');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" style={{ margin: '0 auto' }} /></div>;
  if (!sale) return <div className="empty-state"><h3>Sale not found</h3></div>;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={15} /> Back
          </button>
          <h1 className="page-title">{sale.invoice_number}</h1>
        </div>
        <div className="page-actions">
          <span className={`badge ${paymentStatusBadge(sale.payment_status)}`} style={{ padding: '6px 14px', fontSize: 13 }}>
            {sale.payment_status}
          </span>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={15} /> Print Invoice
          </button>
          <button className="btn btn-danger btn-icon" onClick={() => setShowDeleteModal(true)} title="Cancel / Delete Sale">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="invoice card" style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}>
        {/* Header */}
        <div className="invoice-header">
          <div>
            <div className="invoice-brand">4N Planet</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Mobile Phone Shop</div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-number">{sale.invoice_number}</div>
            <div>Date: {formatDateTime(sale.sale_date)}</div>
            <div style={{ marginTop: 4 }}>
              <span className={`badge ${paymentStatusBadge(sale.payment_status)}`}>{sale.payment_status}</span>
            </div>
          </div>
        </div>

        {/* Customer + Cashier */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{sale.customer_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 6 }}>Cashier</div>
            <div style={{ fontWeight: 600 }}>{sale.cashier_name}</div>
          </div>
        </div>

        {/* Items */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Disc.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.item_id}>
                <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{item.model}</div>
                  {item.warranty_duration && <div style={{ fontSize: 11, color: 'var(--blue-400)' }}>Warranty: {item.warranty_duration}</div>}
                </td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td>{formatCurrency(item.unit_price)}</td>
                <td style={{ color: 'var(--warning-600)' }}>{Number(item.discount) > 0 ? formatCurrency(item.discount) : '—'}</td>
                <td style={{ fontWeight: 700 }}>{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {Number(sale.discount_amount) > 0 && (
              <div className="invoice-total-row" style={{ color: 'var(--warning-600)' }}>
                <span>Discount</span>
                <span>- {formatCurrency(sale.discount_amount)}</span>
              </div>
            )}
            {Number(sale.tax_amount) > 0 && (
              <div className="invoice-total-row">
                <span>Tax</span>
                <span>{formatCurrency(sale.tax_amount)}</span>
              </div>
            )}
            <div className="invoice-total-row grand">
              <span>Grand Total</span>
              <span style={{ color: 'var(--navy-700)' }}>{formatCurrency(sale.grand_total)}</span>
            </div>
            <div className="invoice-total-row" style={{ color: 'var(--success-600)', fontWeight: 600 }}>
              <span>Amount Paid</span>
              <span>{formatCurrency(sale.amount_paid)}</span>
            </div>
            {Number(sale.outstanding_balance) > 0 && (
              <div className="invoice-total-row" style={{ color: 'var(--danger-600)', fontWeight: 700 }}>
                <span>Balance Due</span>
                <span>{formatCurrency(sale.outstanding_balance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--gray-200)', textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
          <p>Thank you for shopping at 4N Planet!</p>
          <p style={{ fontSize: 10, marginTop: 4 }}>Developed by OpusByte</p>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cancel / Delete Sale</h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel and delete invoice <strong>{sale.invoice_number}</strong>?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                The sold items and quantities in this invoice will be automatically restored back to stock inventory.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteSale} disabled={deleting}>
                {deleting ? 'Processing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
