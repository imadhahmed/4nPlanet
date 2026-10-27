// src/pages/auth/Login.jsx — Clean Light Admin Login (Master UI Theme)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-app)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'var(--primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: '#FFFFFF',
            marginBottom: 14,
            boxShadow: '0 4px 12px rgba(49, 87, 213, 0.25)',
          }}>
            4N
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--navy-dark)',
            margin: 0,
            letterSpacing: '-0.4px',
          }}>
            4N Planet
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Mobile Phone Shop Management Dashboard
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 4 }}>
            Sign In
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22 }}>
            Enter your credentials to access the shop system
          </p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 18 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@4nplanet.lk"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  required
                  style={{ paddingLeft: 34 }}
                />
                <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                  style={{ paddingLeft: 34, paddingRight: 38 }}
                />
                <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: 12.5,
                cursor: 'pointer',
                fontWeight: 500,
              }}
              onClick={() => toast('Contact your store administrator to reset your password.')}
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Footer Credit */}
        <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 12 }}>
          Developed by <strong style={{ color: 'var(--navy-dark)' }}>OpusByte</strong>
        </div>
      </div>
    </div>
  );
}
