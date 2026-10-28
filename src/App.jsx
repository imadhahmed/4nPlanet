// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoadingScreen from './components/ui/LoadingScreen.jsx';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard.jsx'));
const ProductList = lazy(() => import('./pages/products/ProductList.jsx'));
const ProductForm = lazy(() => import('./pages/products/ProductForm.jsx'));
const ProductDetail = lazy(() => import('./pages/products/ProductDetail.jsx'));
const Categories = lazy(() => import('./pages/categories/Categories.jsx'));
const Brands = lazy(() => import('./pages/brands/Brands.jsx'));
const POS = lazy(() => import('./pages/pos/POS.jsx'));
const SaleList = lazy(() => import('./pages/sales/SaleList.jsx'));
const SaleDetail = lazy(() => import('./pages/sales/SaleDetail.jsx'));
const Returns = lazy(() => import('./pages/returns/Returns.jsx'));
const PurchaseList = lazy(() => import('./pages/purchases/PurchaseList.jsx'));
const PurchaseForm = lazy(() => import('./pages/purchases/PurchaseForm.jsx'));
const PurchaseDetail = lazy(() => import('./pages/purchases/PurchaseDetail.jsx'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList.jsx'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail.jsx'));
const SupplierList = lazy(() => import('./pages/suppliers/SupplierList.jsx'));
const SupplierDetail = lazy(() => import('./pages/suppliers/SupplierDetail.jsx'));
const Payments = lazy(() => import('./pages/payments/Payments.jsx'));
const Expenses = lazy(() => import('./pages/expenses/Expenses.jsx'));
const WarrantyList = lazy(() => import('./pages/warranty/WarrantyList.jsx'));
const RepairList = lazy(() => import('./pages/repairs/RepairList.jsx'));
const RepairDetail = lazy(() => import('./pages/repairs/RepairDetail.jsx'));
const Reports = lazy(() => import('./pages/reports/Reports.jsx'));
const Users = lazy(() => import('./pages/users/Users.jsx'));
const Settings = lazy(() => import('./pages/settings/Settings.jsx'));

function PrivateRoute({ children, permission }) {
  const { user, loading, initialized, hasPermission } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) {
    return (
      <div className="empty-state" style={{ marginTop: 80 }}>
        <div className="empty-state-icon">🔒</div>
        <h3>Access Denied</h3>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }
  return children;
}

function AppRoutes() {
  const { user, initialized } = useAuth();

  if (!initialized) return <LoadingScreen />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Products */}
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />

          {/* POS & Sales */}
          <Route path="pos" element={<PrivateRoute permission="sales.create"><POS /></PrivateRoute>} />
          <Route path="sales" element={<SaleList />} />
          <Route path="sales/:id" element={<SaleDetail />} />
          <Route path="returns" element={<PrivateRoute permission="sales.return"><Returns /></PrivateRoute>} />
          <Route path="returns/new" element={<PrivateRoute permission="sales.return"><Returns defaultTab="new" /></PrivateRoute>} />

          {/* Purchases */}
          <Route path="purchases" element={<PurchaseList />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="purchases/:id" element={<PurchaseDetail />} />

          {/* Customers */}
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />

          {/* Suppliers */}
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />

          {/* Finances */}
          <Route path="payments" element={<Payments />} />
          <Route path="expenses" element={<Expenses />} />

          {/* Service */}
          <Route path="warranties" element={<WarrantyList />} />
          <Route path="repairs" element={<RepairList />} />
          <Route path="repairs/:id" element={<RepairDetail />} />

          {/* Reports */}
          <Route path="reports" element={<PrivateRoute permission="reports.view"><Reports /></PrivateRoute>} />

          {/* Admin */}
          <Route path="users" element={<PrivateRoute permission="users.view"><Users /></PrivateRoute>} />
          <Route path="settings" element={<PrivateRoute permission="settings.view"><Settings /></PrivateRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
