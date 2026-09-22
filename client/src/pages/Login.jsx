import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdEmail, MdLock, MdAdminPanelSettings, MdBadge, MdStorefront } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Login() {
  const [tab, setTab] = useState('admin');
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const credentials = {
    admin: { email: 'admin@tileshow.com', password: 'admin123' },
    staff: { email: 'rahul@tileshow.com', password: 'staff123' },
  };

  const fillDemo = (role) => {
    setTab(role);
    setForm(credentials[role]);
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

      <div className="login-card" style={{ position: 'relative', zIndex: 1 }}>
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
          <button className={`login-tab${tab === 'admin' ? ' active' : ''}`} onClick={() => fillDemo('admin')}>
            <MdAdminPanelSettings style={{ marginRight: 6 }} /> Admin
          </button>
          <button className={`login-tab${tab === 'staff' ? ' active' : ''}`} onClick={() => fillDemo('staff')}>
            <MdBadge style={{ marginRight: 6 }} /> Staff
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${tab === 'admin' ? 'Admin' : 'Staff'}`}
          </button>
        </form>

        {/* Demo hint */}
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ fontSize: 11, color: 'var(--accent-cyan-light)', fontWeight: 700, marginBottom: 6 }}>
            🎯 DEMO CREDENTIALS
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Admin:</strong> admin@tileshow.com / admin123<br />
            <strong>Staff:</strong> rahul@tileshow.com / staff123
          </div>
        </div>
      </div>
    </div>
  );
}
