// src/components/layout/AppLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 150, display: 'none',
          }}
          className="mobile-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="main-content">
        <Header
          onMobileMenuToggle={() => setMobileSidebarOpen((o) => !o)}
          onSidebarToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer no-print">
          Developed by <strong>OpusByte</strong>
        </footer>
      </div>
    </div>
  );
}
