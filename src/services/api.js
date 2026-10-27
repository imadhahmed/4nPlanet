// src/services/api.js
// Centralized API service layer — all API calls go through here

import axios from 'axios';
import toast from 'react-hot-toast';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Response interceptor — handle auth errors globally
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const isAuthRoute = url.includes('/auth/session') || url.includes('/auth/login');

    if (status === 401 && !isAuthRoute && !window.location.pathname.startsWith('/login')) {
      // Session expired mid-session on a protected page — redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

function handleError(err, defaultMsg = 'An error occurred') {
  const msg = err.response?.data?.message || err.message || defaultMsg;
  toast.error(msg);
  throw err;
}

// ─── Auth ────────────────────────────────────────────────
export const auth = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }).catch((e) => handleError(e, 'Login failed')),
  logout: () => client.post('/auth/logout'),
  session: () => client.get('/auth/session'),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  verifyOtp: (email, otp) => client.post('/auth/verify-otp', { email, otp }),
  resetPassword: (data) => client.post('/auth/reset-password', data),
};

// ─── Dashboard ───────────────────────────────────────────
export const dashboard = {
  get: () => client.get('/dashboard'),
};

// ─── Products ────────────────────────────────────────────
export const products = {
  list: (params) => client.get('/products', { params }),
  get: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.put(`/products/${id}`, data),
  delete: (id) => client.delete(`/products/${id}`),
  serials: (productId) => client.get(`/products/${productId}/serials`),
  searchByImei: (imei) => client.get('/products/imei-search', { params: { imei } }),
  adjustStock: (id, data) => client.post(`/products/${id}/adjust`, data),
};

// ─── Categories ──────────────────────────────────────────
export const categories = {
  list: (params) => client.get('/categories', { params }),
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`),
};

// ─── Brands ──────────────────────────────────────────────
export const brands = {
  list: (params) => client.get('/brands', { params }),
  create: (data) => client.post('/brands', data),
  update: (id, data) => client.put(`/brands/${id}`, data),
  delete: (id) => client.delete(`/brands/${id}`),
};

// ─── Sales ───────────────────────────────────────────────
export const sales = {
  list: (params) => client.get('/sales', { params }),
  get: (id) => client.get(`/sales/${id}`),
  create: (data) => client.post('/sales', data),
  cancel: (id, reason) => client.post(`/sales/${id}/cancel`, { reason }),
  delete: (id) => client.delete(`/sales/${id}`),
  return: (id, data) => client.post(`/sales/${id}/returns`, data),
  items: (id) => client.get(`/sales/${id}/items`),
};

// ─── Purchases ───────────────────────────────────────────
export const purchases = {
  list: (params) => client.get('/purchases', { params }),
  get: (id) => client.get(`/purchases/${id}`),
  create: (data) => client.post('/purchases', data),
  delete: (id) => client.delete(`/purchases/${id}`),
  items: (id) => client.get(`/purchases/${id}/items`),
};

// ─── Customers ───────────────────────────────────────────
export const customers = {
  list: (params) => client.get('/customers', { params }),
  get: (id) => client.get(`/customers/${id}`),
  create: (data) => client.post('/customers', data),
  update: (id, data) => client.put(`/customers/${id}`, data),
  delete: (id) => client.delete(`/customers/${id}`),
  sales: (id) => client.get(`/customers/${id}/sales`),
};

// ─── Suppliers ───────────────────────────────────────────
export const suppliers = {
  list: (params) => client.get('/suppliers', { params }),
  get: (id) => client.get(`/suppliers/${id}`),
  create: (data) => client.post('/suppliers', data),
  update: (id, data) => client.put(`/suppliers/${id}`, data),
  delete: (id) => client.delete(`/suppliers/${id}`),
};

// ─── Payments ────────────────────────────────────────────
export const payments = {
  list: (params) => client.get('/payments', { params }),
  create: (data) => client.post('/payments', data),
};

// ─── Expenses ────────────────────────────────────────────
export const expenses = {
  list: (params) => client.get('/expenses', { params }),
  create: (data) => client.post('/expenses', data),
  update: (id, data) => client.put(`/expenses/${id}`, data),
  delete: (id) => client.delete(`/expenses/${id}`),
};

// ─── Warranties ──────────────────────────────────────────
export const warranties = {
  list: (params) => client.get('/warranties', { params }),
  get: (id) => client.get(`/warranties/${id}`),
  claims: (warrantyId) => client.get(`/warranties/${warrantyId}/claims`),
  addClaim: (warrantyId, data) => client.post(`/warranties/${warrantyId}/claims`, data),
};

// ─── Repairs ─────────────────────────────────────────────
export const repairs = {
  list: (params) => client.get('/repairs', { params }),
  get: (id) => client.get(`/repairs/${id}`),
  create: (data) => client.post('/repairs', data),
  update: (id, data) => client.put(`/repairs/${id}`, data),
  delete: (id) => client.delete(`/repairs/${id}`),
  addPart: (id, data) => client.post(`/repairs/${id}/parts`, data),
};

// ─── Reports ─────────────────────────────────────────────
export const reports = {
  get: (type, params) => client.get('/reports', { params: { type, ...params } }),
};

// ─── Users ───────────────────────────────────────────────
export const users = {
  list: () => client.get('/users'),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  delete: (id) => client.delete(`/users/${id}`),
  deactivate: (id) => client.post(`/users/${id}/deactivate`),
  changePassword: (id, data) => client.post(`/users/${id}/change-password`, data),
};

// ─── Settings ────────────────────────────────────────────
export const settings = {
  get: () => client.get('/settings'),
  update: (data) => client.put('/settings', data),
};

// ─── Activity Logs ───────────────────────────────────────
export const activityLogs = {
  list: (params) => client.get('/activity-logs', { params }),
};
