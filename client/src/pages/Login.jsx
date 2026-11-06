import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Mail, Lock, Shield, BadgeCheck, Store,
  Eye, EyeOff, Phone, KeyRound, X, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [tab, setTab] = useState('admin');
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSplashing, setIsSplashing] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotRole, setForgotRole] = useState('admin');
  const [forgotForm, setForgotForm] = useState({
    email: '',
    phone: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // Full-screen loading splash screen for 2.5 seconds on initial open
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2200; // 2.2s progress fill

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(timer);
        setSplashFading(true); // Smooth 500ms fade-out transition
        setTimeout(() => {
          setIsSplashing(false);
        }, 500);
      }
    }, 25);

    return () => clearInterval(timer);
  }, []);

  const handleTabChange = (role) => {
    setTab(role);
    setForm({ email: '', password: '' });
  };

  const handleOpenForgot = () => {
    setForgotRole(tab);
    setForgotForm({
      email: form.email || '',
      phone: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowForgotPass(false);
    setShowForgotConfirm(false);
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotForm.email || !forgotForm.phone || !forgotForm.newPassword) {
      return toast.error('Please fill all required fields');
    }
    if (forgotForm.newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setForgotLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: forgotForm.email,
        phone: forgotForm.phone,
        newPassword: forgotForm.newPassword,
      });
      toast.success(data.message || 'Password reset successfully!');
      setTab(forgotRole);
      setForm((prev) => ({ ...prev, email: forgotForm.email, password: '' }));
      setShowForgotModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please check your details.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success(`Welcome back!`);
      navigate(result.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        @keyframes pulseLogo {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 12px 35px rgba(124, 58, 237, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 18px 45px rgba(124, 58, 237, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
          }
        }
        @keyframes spinLoader {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Full-screen Loading / Splash Screen */}
      {isSplashing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f5f3ff 55%, #ede9fe 100%)',
            opacity: splashFading ? 0 : 1,
            transform: splashFading ? 'scale(1.02)' : 'scale(1)',
            transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: splashFading ? 'none' : 'auto',
          }}
        >
          {/* Ambient Purple & Cyan Glow Spheres */}
          <div style={{
            position: 'absolute',
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%)',
            top: '12%',
            left: '10%',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.10) 0%, transparent 70%)',
            bottom: '12%',
            right: '10%',
            pointerEvents: 'none',
          }} />

          {/* Centered Brand Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '32px 24px',
            position: 'relative',
            zIndex: 2,
          }}>
            {/* Existing Company / Shop Logo */}
            <div style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 12px 35px rgba(124, 58, 237, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
              animation: 'pulseLogo 2s infinite ease-in-out',
            }}>
              <Store size={40} color="#ffffff" />
            </div>

            {/* Existing Shop Name */}
            <h1 style={{
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 6px 0',
            }}>
              TileShow
            </h1>

            {/* Tagline */}
            <p style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#6b7280',
              margin: '0 0 28px 0',
              letterSpacing: '0.2px',
            }}>
              Customer Feedback & Performance CRM
            </p>

            {/* Sleek Minimal Loading Progress Bar */}
            <div style={{
              width: 190,
              maxWidth: '75vw',
              height: 4,
              borderRadius: 999,
              background: 'rgba(124, 58, 237, 0.1)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              marginBottom: 14,
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #7c3aed 0%, #06b6d4 100%)',
                transition: 'width 0.05s linear',
                boxShadow: '0 0 10px rgba(124, 58, 237, 0.45)',
              }} />
            </div>

            {/* Subtle Circular Spinner & Clean Status (No Percentages) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: '#8b5cf6',
              letterSpacing: '0.3px',
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid rgba(124, 58, 237, 0.2)',
                borderTopColor: '#7c3aed',
                animation: 'spinLoader 0.75s linear infinite',
              }} />
              <span>Loading workspace...</span>
            </div>
          </div>
        </div>
      )}

      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0
      }}>
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
          top: -100, left: -100
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
          bottom: -50, right: -50
        }} />
        {/* Floating tiles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 60 + i * 10, height: 60 + i * 10,
            border: '1px solid rgba(124,58,237,0.1)',
            borderRadius: 8,
            top: `${10 + i * 14}%`,
            left: `${5 + i * 14}%`,
            transform: `rotate(${i * 12}deg)`,
            opacity: 0.3,
          }} />
        ))}
      </div>

      <div
        className="login-card"
        style={{
          position: 'relative',
          zIndex: 1,
          animation: isSplashing ? 'none' : 'fadeInCard 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="login-logo">
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 0 40px rgba(124,58,237,0.4)'
          }}>
            <Store size={32} color="white" />
          </div>
          <h1>TileShow</h1>
          <p>Customer Feedback & Performance CRM</p>
        </div>

        {/* Role Tabs */}
        <div className="login-tab-group">
          <button
            type="button"
            className={`login-tab${tab === 'admin' ? ' active' : ''}`}
            onClick={() => handleTabChange('admin')}
          >
            <Shield size={16} style={{ marginRight: 6 }} /> Admin
          </button>
          <button
            type="button"
            className={`login-tab${tab === 'staff' ? ' active' : ''}`}
            onClick={() => handleTabChange('staff')}
          >
            <BadgeCheck size={16} style={{ marginRight: 6 }} /> Staff
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="email"
                className="form-control"
                style={{ paddingLeft: 38 }}
                placeholder={tab === 'admin' ? 'admin@company.com' : 'staff@company.com'}
                value={form.email}
                autoComplete="off"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={handleOpenForgot}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7c3aed',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.opacity = '0.75')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                style={{ paddingLeft: 38, paddingRight: 40 }}
                placeholder="Enter your password"
                value={form.password}
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${tab === 'admin' ? 'Admin' : 'Staff'}`}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !forgotLoading) setShowForgotModal(false);
          }}
        >
          <div
            className="modal-content fade-in"
            style={{
              background: '#ffffff',
              borderRadius: 18,
              maxWidth: 440,
              width: '100%',
              padding: '24px 24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-glass)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                }}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Reset Password
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Verify your identity to create a new password
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                disabled={forgotLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Role Switcher in Modal */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: 10,
              padding: 4,
              marginBottom: 18,
              gap: 4,
            }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: forgotRole === 'admin' ? '#ffffff' : 'transparent',
                  color: forgotRole === 'admin' ? '#7c3aed' : 'var(--text-secondary)',
                  boxShadow: forgotRole === 'admin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => setForgotRole('admin')}
              >
                <Shield size={14} /> Admin
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: forgotRole === 'staff' ? '#ffffff' : 'transparent',
                  color: forgotRole === 'staff' ? '#7c3aed' : 'var(--text-secondary)',
                  boxShadow: forgotRole === 'staff' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
                onClick={() => setForgotRole('staff')}
              >
                <BadgeCheck size={14} /> Staff
              </button>
            </div>

            <form onSubmit={handleForgotSubmit}>
              {/* Email Address */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Registered Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: 38, fontSize: 13, height: 40 }}
                    placeholder={forgotRole === 'admin' ? 'admin@tileshow.com' : 'staff@tileshow.com'}
                    value={forgotForm.email}
                    onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Registered Phone */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Registered Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type="tel"
                    className="form-control"
                    style={{ paddingLeft: 38, fontSize: 13, height: 40 }}
                    placeholder="e.g. 9876543210"
                    value={forgotForm.phone}
                    onChange={(e) => setForgotForm({ ...forgotForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Enter the 10-digit mobile number linked to this account
                </div>
              </div>

              {/* New Password */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 12 }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type={showForgotPass ? 'text' : 'password'}
                    className="form-control"
                    style={{ paddingLeft: 38, paddingRight: 40, fontSize: 13, height: 40 }}
                    placeholder="At least 6 characters"
                    value={forgotForm.newPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, newPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPass(!showForgotPass)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showForgotPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type={showForgotConfirm ? 'text' : 'password'}
                    className="form-control"
                    style={{ paddingLeft: 38, paddingRight: 40, fontSize: 13, height: 40 }}
                    placeholder="Re-enter new password"
                    value={forgotForm.confirmPassword}
                    onChange={(e) => setForgotForm({ ...forgotForm, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotConfirm(!showForgotConfirm)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showForgotConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center', gap: 6 }}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Updating...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
