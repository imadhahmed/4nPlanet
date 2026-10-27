// src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, ShoppingCart, Receipt,
  ShoppingBag, PlusCircle, Users, Truck, CreditCard, Wallet, Shield, Wrench,
  BarChart3, Settings, UserCog, ChevronLeft, ChevronRight, Smartphone,
  LogOut, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { initials } from '../../utils/format.js';
import clsx from 'clsx';
import logoImg from '../../assets/4N Planet POS System Logo.png';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/pos', icon: ShoppingCart, label: 'Point of Sale', permission: 'sales.create' },
      { to: '/sales', icon: Receipt, label: 'Sales History' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/categories', icon: Tag, label: 'Categories' },
      { to: '/brands', icon: Smartphone, label: 'Brands' },
    ],
  },
  {
    label: 'Purchases',
    items: [
      { to: '/purchases/new', icon: PlusCircle, label: 'New Purchase', permission: 'purchases.create' },
      { to: '/purchases', icon: ShoppingBag, label: 'Purchase History' },
      { to: '/suppliers', icon: Truck, label: 'Suppliers' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/customers', icon: Users, label: 'Customers' },
    ],
  },
  {
    label: 'Repairs & Warranty',
    items: [
      { to: '/repairs', icon: Wrench, label: 'Repair Jobs' },
      { to: '/warranties', icon: Shield, label: 'Warranty Records' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payments', icon: CreditCard, label: 'Payments' },
      { to: '/expenses', icon: Wallet, label: 'Expenses' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports', permission: 'reports.view' },
    ],
  },
  {
    label: 'Users & Permissions',
    items: [
      { to: '/users', icon: UserCog, label: 'Staff & Roles', permission: 'users.view' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', permission: 'settings.view' },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }) {
  const { user, logout, hasPermission } = useAuth();
  const roleLabel = user?.role?.replace('_', ' ') || 'Staff';

  return (
    <aside className={clsx('sidebar', { collapsed, 'mobile-open': mobileOpen })}>
      {/* Brand Header */}
      <div className="sidebar-header-wrapper">
        <NavLink
          to="/dashboard"
          className="sidebar-logo"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, borderBottom: 'none' }}
          onClick={onMobileClose}
        >
          <img
            src={logoImg}
            alt="4N Planet POS"
            style={{
              width: 38,
              height: 38,
              objectFit: 'contain',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-name">4N Planet</div>
              <div className="sidebar-logo-sub">Shop Management</div>
            </div>
          )}
        </NavLink>
        <button
          className="sidebar-mobile-close-btn"
          onClick={onMobileClose}
          aria-label="Close menu"
          title="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label} style={{ marginBottom: 4 }}>
              <div className="sidebar-section-label">{section.label}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx('sidebar-item', { active: isActive })
                  }
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="item-icon">
                    <item.icon size={18} />
                  </span>
                  <span className="item-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer Profile & Collapse Toggle */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 6px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--neutral-surface)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <div className="user-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                {initials(user?.name || 'U')}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: 'var(--navy-dark)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.name || 'Shop Admin'}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {roleLabel}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', padding: 5, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            title="Sign Out"
            className="sidebar-collapse-btn"
            style={{ justifyContent: 'center', padding: '8px 0' }}
          >
            <LogOut size={16} />
          </button>
        )}

        {/* Sidebar Collapse Button */}
        <button className="sidebar-collapse-btn" onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span className="item-icon">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </span>
          <span className="item-text">{collapsed ? '' : 'Collapse Menu'}</span>
        </button>
      </div>
    </aside>
  );
}
