// src/utils/format.js
// Shared formatting utilities

const LK_FORMATTER = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
  return LK_FORMATTER.format(Number(amount) || 0);
}

export function formatNumber(n, decimals = 0) {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(n) || 0);
}

const TZ = 'Asia/Colombo';

export function formatDate(iso, opts = {}) {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-LK', {
      timeZone: TZ,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...opts,
    }).format(date);
  } catch {
    return iso;
  }
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-LK', {
      timeZone: TZ,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}

export function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

export function formatPercent(val, total) {
  if (!total) return '0%';
  return `${((val / total) * 100).toFixed(1)}%`;
}

export function initials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase()).filter(Boolean).slice(0, 2).join('');
}

export function truncate(str, len = 40) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function paymentStatusBadge(status) {
  const map = {
    paid: 'badge-green',
    partial: 'badge-amber',
    unpaid: 'badge-red',
  };
  return map[status] || 'badge-gray';
}

export function saleStatusBadge(status) {
  const map = {
    completed: 'badge-green',
    cancelled: 'badge-red',
    returned: 'badge-amber',
  };
  return map[status] || 'badge-gray';
}

export function warrantyStatusBadge(status) {
  const map = {
    active: 'badge-green',
    expired: 'badge-red',
    claimed: 'badge-amber',
    void: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export function repairStatusBadge(status) {
  const map = {
    received: 'badge-blue',
    diagnosing: 'badge-purple',
    waiting_parts: 'badge-amber',
    in_progress: 'badge-cyan',
    ready: 'badge-green',
    collected: 'badge-gray',
    cancelled: 'badge-red',
  };
  return map[status] || 'badge-gray';
}

export function repairStatusLabel(status) {
  const map = {
    received: 'Received',
    diagnosing: 'Diagnosing',
    waiting_parts: 'Waiting for Parts',
    in_progress: 'In Progress',
    ready: 'Ready',
    collected: 'Collected',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}
