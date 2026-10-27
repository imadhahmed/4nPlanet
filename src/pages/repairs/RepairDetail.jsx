// src/pages/repairs/RepairDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Wrench, Plus, CheckCircle2, AlertCircle, Save, Phone, Trash2 } from 'lucide-react';
import { repairs as repairsApi, products as productsApi } from '../../services/api.js';
import { formatCurrency, formatDate, formatDateTime, repairStatusBadge, repairStatusLabel } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function RepairDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Status & Diagnosis editable state
  const [status, setStatus] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [laborCharges, setLaborCharges] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');

  // Add Part Modal
  const [showPartModal, setShowPartModal] = useState(false);
  const [productList, setProductList] = useState([]);
  const [partForm, setPartForm] = useState({
    product_id: '',
    part_name: '',
    quantity: 1,
    unit_price: '',
  });
  const [addingPart, setAddingPart] = useState(false);

  const fetchJob = () => {
    setLoading(true);
    repairsApi.get(id)
      .then((res) => {
        const j = res.data.data.job;
        setJob(j);
        setStatus(j.status || 'received');
        setDiagnosis(j.diagnosis || '');
        setLaborCharges(Number(j.labor_charges) || 0);
        setPaymentStatus(j.payment_status || 'unpaid');
      })
      .catch(() => {
        toast.error('Failed to load repair job');
        navigate('/repairs');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJob();
    productsApi.list({ status: 'active' })
      .then((res) => setProductList(res.data.data.products || []))
      .catch(() => {});
  }, [id]);

  const handleUpdateJob = async () => {
    setSaving(true);
    try {
      await repairsApi.update(id, {
        status,
        diagnosis,
        labor_charges: Number(laborCharges) || 0,
        payment_status: paymentStatus,
      });
      toast.success('Repair job updated');
      fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    setDeleting(true);
    try {
      await repairsApi.delete(id);
      toast.success('Repair job deleted successfully');
      navigate('/repairs');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete repair job');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectProduct = (prodId) => {
    const prod = productList.find((p) => p.product_id === prodId);
    if (prod) {
      setPartForm({
        ...partForm,
        product_id: prodId,
        part_name: prod.name,
        unit_price: Number(prod.selling_price || prod.retail_price) || 0,
      });
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!partForm.part_name.trim()) return toast.error('Part name is required');
    const price = Number(partForm.unit_price);
    if (price < 0) return toast.error('Valid price is required');

    setAddingPart(true);
    try {
      await repairsApi.addPart(id, {
        ...partForm,
        quantity: Number(partForm.quantity) || 1,
        unit_price: price,
      });
      toast.success('Part added to repair job');
      setShowPartModal(false);
      setPartForm({ product_id: '', part_name: '', quantity: 1, unit_price: '' });
      fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to attach part');
    } finally {
      setAddingPart(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
        <p>Loading repair ticket...</p>
      </div>
    );
  }

  if (!job) return null;

  const parts = job.parts || [];
  const partsCost = parts.reduce((sum, p) => sum + (Number(p.total_price) || 0), 0);
  const totalCost = partsCost + Number(laborCharges || 0);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/repairs')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="page-title">{job.job_number}</h1>
              <span className={clsx('badge', repairStatusBadge(status))}>
                {repairStatusLabel(status)}
              </span>
            </div>
            <p className="page-subtitle">
              {job.brand} {job.model}
            </p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print Repair Slip
          </button>
          <button className="btn btn-primary" onClick={handleUpdateJob} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn btn-danger btn-icon" onClick={() => setShowDeleteModal(true)} title="Delete repair ticket">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Customer & Device Information */}
      <div className="grid-3" style={{ gap: 16, marginBottom: 20 }}>
        <div className="card">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Customer Details</span>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{job.customer_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--blue-400)', fontSize: 13, marginTop: 2 }}>
            <Phone size={13} /> {job.customer_phone || 'No phone'}
          </div>
        </div>

        <div className="card">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Device & Issue</span>
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{job.brand} {job.model}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {job.issue_description}
          </div>
        </div>

        <div className="card">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dates & Timing</span>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <div><strong>Received:</strong> {formatDate(job.date_received || job.created_at)}</div>
            <div><strong>Expected:</strong> {formatDate(job.expected_delivery) || 'Not set'}</div>
          </div>
        </div>
      </div>

      {/* Workshop Controls: Status, Diagnosis, Charges */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Job Status & Workflow</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Current Service Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="received">Received</option>
                <option value="diagnosing">Diagnosing</option>
                <option value="waiting_parts">Waiting for Parts</option>
                <option value="in_progress">In Progress / Servicing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="collected">Collected by Customer</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Technical Diagnosis & Work Notes</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Findings: motherboard short-circuit fixed, screen adhesive replaced, tested OK..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Billing & Charges</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Parts Cost:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(partsCost)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Labor / Service Fee:</span>
                <div style={{ width: 140 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    style={{ textAlign: 'right' }}
                    value={laborCharges}
                    onChange={(e) => setLaborCharges(e.target.value)}
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
                <span>Final Total Cost:</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">Payment Status</label>
                <select
                  className="form-select"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid & Settled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parts Used */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Replacement Parts & Components</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPartModal(true)}>
            <Plus size={15} /> Add Replacement Part
          </button>
        </div>

        {parts.length === 0 ? (
          <div className="empty-state">
            <Wrench size={32} />
            <p>No replacement parts attached yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Part / Component Name</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p, idx) => (
                  <tr key={p.part_id || idx}>
                    <td style={{ fontWeight: 500 }}>{p.part_name}</td>
                    <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(p.unit_price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Part Modal */}
      {showPartModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Attach Replacement Part</h3>
              <button className="btn-close" onClick={() => setShowPartModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddPart}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Pick from Stock (Optional)</label>
                  <select
                    className="form-select"
                    value={partForm.product_id}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                  >
                    <option value="">Custom Part / Non-inventory...</option>
                    {productList.map((p) => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.name} (Stock: {p.stock_quantity}) — {formatCurrency(p.selling_price || p.retail_price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Part Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. iPhone 13 OLED Display OEM"
                    value={partForm.part_name}
                    onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={partForm.quantity}
                      onChange={(e) => setPartForm({ ...partForm, quantity: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (LKR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={partForm.unit_price}
                      onChange={(e) => setPartForm({ ...partForm, unit_price: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPartModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingPart}>
                  {addingPart ? 'Attaching...' : 'Attach Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete repair ticket <strong>{job.job_number}</strong> ({job.brand} {job.model})?</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                This will delete the job history and any attached parts records permanently.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteJob} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
