// src/pages/repairs/RepairList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Wrench, Eye, Smartphone, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { repairs as repairsApi, brands as brandsApi } from '../../services/api.js';
import { formatCurrency, formatDate, repairStatusBadge, repairStatusLabel } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 15;

export default function RepairList() {
  const navigate = useNavigate();
  const [repairList, setRepairList] = useState([]);
  const [brandList, setBrandList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  // Add Repair Job Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    brand: '',
    model: '',
    imei: '',
    issue_description: '',
    estimated_cost: '',
    expected_delivery: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    brandsApi.list({ active_only: true })
      .then((res) => setBrandList(res.data.data.brands || []))
      .catch(() => {});
  }, []);

  const fetchRepairs = () => {
    setLoading(true);
    repairsApi.list({ q, status })
      .then((res) => {
        setRepairList(res.data.data.repairs || []);
      })
      .catch(() => toast.error('Failed to load repair jobs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepairs();
    setPage(1);
  }, [q, status]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error('Customer name is required');
    if (!form.brand.trim()) return toast.error('Device brand is required');
    if (!form.issue_description.trim()) return toast.error('Problem description is required');

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        estimated_cost: Number(form.estimated_cost) || 0,
      };
      const res = await repairsApi.create(payload);
      toast.success('Repair job ticket created');
      setShowModal(false);
      setForm({
        customer_name: '',
        customer_phone: '',
        brand: '',
        model: '',
        imei: '',
        issue_description: '',
        estimated_cost: '',
        expected_delivery: '',
      });
      navigate(`/repairs/${res.data.data.job.job_id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create repair ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRepair = async (r) => {
    if (!window.confirm(`Are you sure you want to delete repair ticket "${r.job_number}" for ${r.customer_name}?`)) return;
    try {
      await repairsApi.delete(r.job_id);
      toast.success('Repair job ticket deleted');
      fetchRepairs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete repair ticket');
    }
  };

  const paginated = repairList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(repairList.length / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Repair Service & Workshop</h1>
          <p className="page-subtitle">Manage device servicing, hardware diagnoses, parts, and technician tickets</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Repair Ticket
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filter bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ minWidth: 280 }}>
            <Search size={15} className="search-icon" />
            <input
              type="search"
              className="form-input"
              placeholder="Search job #, customer, model..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Repair Statuses</option>
            <option value="received">Received</option>
            <option value="diagnosing">Diagnosing</option>
            <option value="waiting_parts">Waiting for Parts</option>
            <option value="in_progress">In Progress</option>
            <option value="ready">Ready for Pickup</option>
            <option value="collected">Collected / Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading repair jobs...</p>
          </div>
        ) : repairList.length === 0 ? (
          <div className="empty-state">
            <Wrench size={36} />
            <p>No repair tickets found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Number</th>
                  <th>Customer</th>
                  <th>Device / Model</th>
                  <th>Issue Reported</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Est. Cost</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.job_id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.job_number}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.customer_phone || 'No phone'}</div>
                    </td>
                    <td>{r.brand} {r.model}</td>
                    <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.issue_description}
                    </td>
                    <td>
                      <span className={clsx('badge', repairStatusBadge(r.status))}>
                        {repairStatusLabel(r.status)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(r.estimated_cost || 0)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => navigate(`/repairs/${r.job_id}`)}
                          title="Open Repair Ticket"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => handleDeleteRepair(r)}
                          title="Delete Repair Ticket"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, repairList.length)} of {repairList.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Repair Ticket Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Repair Job Ticket</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateJob}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ruwan Silva"
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 0712345678"
                      value={form.customer_phone}
                      onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Device Brand *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Samsung, Apple, Xiaomi"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Device Model</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Galaxy S23 Ultra"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Device Serial / Color (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Optional details..."
                    value={form.imei}
                    onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue / Defect Description *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe problem: Screen replacement, charging port damaged, water damaged..."
                    value={form.issue_description}
                    onChange={(e) => setForm({ ...form, issue_description: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Cost (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      placeholder="0.00"
                      value={form.estimated_cost}
                      onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Return Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.expected_delivery}
                      onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Ticket...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
