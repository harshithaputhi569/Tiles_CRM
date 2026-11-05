import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdEmail, MdLock, MdAdminPanelSettings, MdBadge, MdStorefront } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Login() {
  const [tab, setTab] = useState('admin');
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSplashing, setIsSplashing] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [progress, setProgress] = useState(0);
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
              <MdStorefront style={{ color: '#ffffff', fontSize: 44 }} />
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
            <MdStorefront style={{ color: 'white', fontSize: 32 }} />
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
            <MdAdminPanelSettings style={{ marginRight: 6 }} /> Admin
          </button>
          <button
            type="button"
            className={`login-tab${tab === 'staff' ? ' active' : ''}`}
            onClick={() => handleTabChange('staff')}
          >
            <MdBadge style={{ marginRight: 6 }} /> Staff
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <MdEmail style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: 18
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
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <MdLock style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', fontSize: 18
              }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: 38 }}
                placeholder="Enter your password"
                value={form.password}
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${tab === 'admin' ? 'Admin' : 'Staff'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
