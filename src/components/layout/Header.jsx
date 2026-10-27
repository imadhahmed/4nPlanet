// src/components/layout/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu, Bell, ChevronDown, LogOut, User, Settings, Search,
  PlusCircle, ShoppingCart, ChevronRight, Package,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { initials } from '../../utils/format.js';

const ROUTE_MAP = {
  '/dashboard': { section: 'Overview', title: 'Dashboard' },
  '/pos': { section: 'Sales', title: 'Point of Sale' },
  '/sales': { section: 'Sales', title: 'Sales History' },
  '/products': { section: 'Inventory', title: 'Products' },
  '/products/new': { section: 'Inventory', title: 'Add Product' },
  '/categories': { section: 'Inventory', title: 'Categories' },
  '/brands': { section: 'Inventory', title: 'Brands' },
  '/purchases': { section: 'Purchases', title: 'Purchase History' },
  '/purchases/new': { section: 'Purchases', title: 'New Purchase' },
  '/suppliers': { section: 'Purchases', title: 'Suppliers' },
  '/customers': { section: 'Customers', title: 'Customers' },
  '/repairs': { section: 'Repairs & Warranty', title: 'Repair Jobs' },
  '/warranties': { section: 'Repairs & Warranty', title: 'Warranty Records' },
  '/payments': { section: 'Finance', title: 'Payments' },
  '/expenses': { section: 'Finance', title: 'Expenses' },
  '/reports': { section: 'Reports', title: 'Reports' },
  '/users': { section: 'Users & Permissions', title: 'Staff' },
  '/settings': { section: 'Settings', title: 'Settings' },
};

export default function Header({ onMobileMenuToggle, onSidebarToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const menuRef = useRef(null);
  const quickRef = useRef(null);

  // Determine current section & title
  const currentRoute = Object.entries(ROUTE_MAP).find(
    ([path]) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'))
  );
  const section = currentRoute?.[1]?.section || 'Shop';
  const title = currentRoute?.[1]?.title || 'Overview';

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(e.target)) {
        setQuickOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleLabel = user?.role?.replace('_', ' ') || 'Staff';

  return (
    <header className="header no-print">
      {/* Left Area: Toggle & Breadcrumbs */}
      <div className="header-left">
        <button
          className="icon-btn header-toggle-btn"
          onClick={() => {
            if (window.innerWidth <= 768) {
              onMobileMenuToggle?.();
            } else {
              onSidebarToggle?.();
            }
          }}
          title="Toggle Navigation"
          aria-label="Toggle Navigation"
        >
          <Menu size={18} />
        </button>

        <nav className="header-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/dashboard" className="crumb-parent">4N Planet</Link>
          <ChevronRight size={13} className="crumb-separator" />
          <span className="crumb-parent">{section}</span>
          <ChevronRight size={13} className="crumb-separator" />
          <span className="crumb-current">{title}</span>
        </nav>
      </div>

      {/* Global Search */}
      <div className="header-search">
        <Search size={16} className="header-search-icon" />
        <input
          type="search"
          placeholder="Search products, sales..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              navigate(`/products?q=${encodeURIComponent(e.target.value.trim())}`);
            }
          }}
        />
        <span className="header-search-shortcut">↵</span>
      </div>

      {/* Action Buttons */}
      <div className="header-actions">
        {/* Quick Action Button */}
        <div style={{ position: 'relative' }} ref={quickRef}>
          <button
            className="btn btn-primary btn-sm header-pos-btn"
            onClick={() => navigate('/pos')}
            title="Point of Sale"
          >
            <ShoppingCart size={15} />
            <span className="header-pos-label">POS / Sale</span>
          </button>
        </div>

        {/* Notifications */}
        <button className="icon-btn" title="Notifications" onClick={() => navigate('/dashboard')}>
          <Bell size={18} />
          <span className="badge-dot" />
        </button>

        {/* User Dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="user-menu"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
          >
            <div className="user-avatar">{initials(user?.name || 'U')}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-role">{roleLabel}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: '#FFFFFF', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: 200,
              zIndex: 250,
              overflow: 'hidden',
              animation: 'slideUp 0.15s ease',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--neutral-surface)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-dark)' }}>{user?.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{user?.email}</div>
              </div>
              <div style={{ padding: '6px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12.5 }}
                  onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                >
                  <Settings size={15} /> Settings
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12.5, color: 'var(--danger)' }}
                  onClick={logout}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
