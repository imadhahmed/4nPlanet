// src/pages/warranty/WarrantyList.jsx
import React, { useState, useEffect } from 'react';
import { Search, Shield, AlertTriangle, CheckCircle2, Clock, Smartphone, Plus } from 'lucide-react';
import { warranties as warrantiesApi } from '../../services/api.js';
import { formatDate, warrantyStatusBadge } from '../../utils/format.js';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PAGE_SIZE = 15;

export default function WarrantyList() {
  const [warrantyList, setWarrantyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  // Claim Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [claimForm, setClaimForm] = useState({
    issue_description: '',
    claim_type: 'repair',
    resolution_notes: '',
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const fetchWarranties = () => {
    setLoading(true);
    warrantiesApi.list({ q, status })
      .then((res) => {
        setWarrantyList(res.data.data.warranties || []);
      })
      .catch(() => toast.error('Failed to load warranties'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWarranties();
    setPage(1);
  }, [q, status]);

  const openClaimModal = (w) => {
    setSelectedWarranty(w);
    setClaimForm({ issue_description: '', claim_type: 'repair', resolution_notes: '' });
    setShowClaimModal(true);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimForm.issue_description.trim()) {
      return toast.error('Please describe the device defect or issue');
    }

    setSubmittingClaim(true);
    try {
      await warrantiesApi.addClaim(selectedWarranty.warranty_id, claimForm);
      toast.success('Warranty claim registered successfully');
      setShowClaimModal(false);
      fetchWarranties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit warranty claim');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const paginated = warrantyList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(warrantyList.length / PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Warranty Management</h1>
          <p className="page-subtitle">Track serialized smartphone warranties, claim registrations, and expiry</p>
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
              placeholder="Search customer, invoice #, product..."
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
            <option value="">All Warranty Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="claimed">Claim Filed</option>
            <option value="void">Void</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading warranty records...</p>
          </div>
        ) : warrantyList.length === 0 ? (
          <div className="empty-state">
            <Shield size={36} />
            <p>No warranty records found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Device / Product</th>
                  <th>Warranty Duration</th>
                  <th>Customer Name</th>
                  <th>Invoice #</th>
                  <th>Start Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((w) => {
                  const isExpired = w.expiry_date && new Date(w.expiry_date) < new Date();
                  const currentStatus = isExpired ? 'expired' : w.status || 'active';
                  return (
                    <tr key={w.warranty_id}>
                      <td style={{ fontWeight: 600 }}>{w.product_name || 'Mobile Phone'}</td>
                      <td style={{ fontWeight: 500 }}>{w.warranty_duration || '12 Months'}</td>
                      <td>{w.customer_name || 'Walk-in Customer'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{w.invoice_number || '—'}</td>
                      <td>{formatDate(w.start_date || w.created_at)}</td>
                      <td>{formatDate(w.expiry_date)}</td>
                      <td>
                        <span className={clsx('badge', warrantyStatusBadge(currentStatus))}>
                          {currentStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {currentStatus === 'active' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openClaimModal(w)}
                          >
                            <Plus size={13} /> File Claim
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, warrantyList.length)} of {warrantyList.length}
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

      {/* Claim Filing Modal */}
      {showClaimModal && selectedWarranty && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">File Warranty Claim</h3>
              <button className="btn-close" onClick={() => setShowClaimModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleClaimSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--blue-50)', padding: 12, borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <div><strong>Device:</strong> {selectedWarranty.product_name}</div>
                  <div><strong>IMEI:</strong> {selectedWarranty.imei1 || selectedWarranty.serial_number}</div>
                  <div><strong>Customer:</strong> {selectedWarranty.customer_name}</div>
                  <div><strong>Warranty Expiry:</strong> {formatDate(selectedWarranty.expiry_date)}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Claim Type *</label>
                  <select
                    className="form-select"
                    value={claimForm.claim_type}
                    onChange={(e) => setClaimForm({ ...claimForm, claim_type: e.target.value })}
                  >
                    <option value="repair">Warranty Repair / Service</option>
                    <option value="replacement">Device Replacement</option>
                    <option value="credit">Store Credit / Refund</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Defect / Issue Description *</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Describe problem: display flickering, battery drain, mic failure..."
                    value={claimForm.issue_description}
                    onChange={(e) => setClaimForm({ ...claimForm, issue_description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Resolution Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Sent to authorized service center, replaced display..."
                    value={claimForm.resolution_notes}
                    onChange={(e) => setClaimForm({ ...claimForm, resolution_notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClaimModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingClaim}>
                  {submittingClaim ? 'Registering...' : 'Register Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
