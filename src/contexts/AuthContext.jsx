// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    auth.session()
      .then((res) => {
        setUser(res.data.data.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        setInitialized(true);
      });
  }, []);

  const login = async (email, password) => {
    const res = await auth.login(email, password);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const role = user.role;
    const PERMS = {
      admin: ['all'],
      manager: [
        'products.view', 'products.create', 'products.edit', 'products.delete',
        'categories.manage', 'brands.manage', 'inventory.view', 'inventory.adjust',
        'sales.create', 'sales.view', 'sales.discount', 'sales.cancel', 'sales.return',
        'purchases.view', 'purchases.create', 'purchases.edit',
        'customers.view', 'customers.create', 'customers.edit',
        'suppliers.view', 'suppliers.manage',
        'payments.view', 'payments.create',
        'expenses.view', 'expenses.create',
        'reports.view', 'reports.export',
        'warranties.view', 'warranties.manage',
        'repairs.view', 'repairs.create', 'repairs.update',
        'settings.view', 'users.view',
      ],
      cashier: [
        'products.view', 'inventory.view',
        'sales.create', 'sales.view',
        'customers.view', 'customers.create', 'customers.edit',
        'payments.view', 'payments.create',
        'warranties.view', 'repairs.view', 'repairs.create',
      ],
      stock_manager: [
        'products.view', 'products.create', 'products.edit',
        'categories.manage', 'brands.manage',
        'inventory.view', 'inventory.adjust',
        'purchases.view', 'purchases.create',
        'suppliers.view',
      ],
      technician: [
        'warranties.view', 'warranties.manage',
        'repairs.view', 'repairs.update',
      ],
    };
    if (role === 'admin') return true;
    return (PERMS[role] || []).includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, initialized, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
