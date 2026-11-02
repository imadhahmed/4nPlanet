// src/components/ui/ErrorBoundary.jsx
import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            maxWidth: 520,
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 36,
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            border: '1px solid var(--border-color, #E5E9F0)',
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <AlertCircle size={32} />
            </div>

            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--navy-dark, #1B2A4A)',
              marginBottom: 8,
            }}>
              Something Went Wrong
            </h2>

            <p style={{
              fontSize: 13.5,
              color: 'var(--text-secondary, #7A8597)',
              lineHeight: 1.5,
              marginBottom: 20,
            }}>
              An unexpected error occurred while rendering this page. You can reload or navigate back to the dashboard.
            </p>

            {this.state.error && (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: '#DC2626',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: 24,
                maxHeight: 120,
              }}>
                {String(this.state.error.message || this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReload}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px' }}
              >
                <RotateCcw size={15} /> Reload Page
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={this.handleGoHome}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px' }}
              >
                <Home size={15} /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

