import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { StatCard, LoadingSpinner, RatingBadge, EmptyState } from '../../components/UI';
import { MdPeople, MdFeedback, MdStar, MdTrendingUp } from 'react-icons/md';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
      </div>
    );
  }
  return null;
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    api.get('/feedback').then(r => setFeedbacks(r.data.feedbacks)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalFeedback = feedbacks.length;
  const avgRating = totalFeedback > 0 ? (feedbacks.reduce((s, f) => s + f.overallRating, 0) / totalFeedback).toFixed(2) : 0;
  const satisfaction = totalFeedback > 0 ? ((feedbacks.filter(f => f.overallRating >= 4).length / totalFeedback) * 100).toFixed(1) : 0;
  const complaints = feedbacks.filter(f => f.hasComplaint).length;

  // Today's count
  const todayStr = new Date().toDateString();
  const todayFeedback = feedbacks.filter(f => new Date(f.createdAt).toDateString() === todayStr).length;

  // Trend: last 7 days
  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const count = feedbacks.filter(f => new Date(f.createdAt).toDateString() === d.toDateString()).length;
    const avgR = feedbacks.filter(f => new Date(f.createdAt).toDateString() === d.toDateString());
    const r = avgR.length > 0 ? (avgR.reduce((s, f) => s + f.overallRating, 0) / avgR.length).toFixed(1) : 0;
    return { label, count, rating: parseFloat(r) };
  });

  return (
    <>
      <Topbar title="My Dashboard" subtitle={`Welcome back, ${user?.name}`} />
      <div className="page-content">

        {/* Welcome Banner */}
        <div style={{
          padding: '20px 24px', marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(6,182,212,0.05) 100%)',
          border: '1px solid rgba(124,58,237,0.15)', borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }} className="fade-in">
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}! 👋</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{today}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Today's Feedback</div>
            <div style={{ fontSize: 36, fontWeight: 900, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {todayFeedback}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon={<MdFeedback />} label="Total Feedback" value={totalFeedback}
            iconBg="rgba(124,58,237,0.15)" iconColor="#a78bfa" />
          <StatCard icon={<MdStar />} label="Avg. Rating"
            value={<span>{avgRating}<span style={{ fontSize: 14, fontWeight: 400 }}>/5</span></span>}
            iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" />
          <StatCard icon={<MdTrendingUp />} label="Satisfaction Rate" value={`${satisfaction}%`}
            iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <StatCard icon={<MdPeople />} label="Complaints Received" value={complaints}
            iconBg="rgba(239,68,68,0.15)" iconColor="#f87171" />
        </div>

        {/* Chart + Recent */}
        <div className="analytics-grid">
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">📈 My Feedback Trend (7 Days)</span>
            </div>
            <div className="card-body chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="staffGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Feedback" stroke="#7c3aed" fill="url(#staffGrad)" strokeWidth={2} dot={{ fill: '#7c3aed', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">📋 Recent Feedback</span>
            </div>
            {loading ? <LoadingSpinner /> : feedbacks.length === 0 ? (
              <EmptyState icon="💬" message="No feedback yet" sub="Start by registering a customer visit" />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Customer</th><th>Rating</th><th>Complaint</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {feedbacks.slice(0, 8).map(f => (
                      <tr key={f._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{f.customer?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.customer?.customerType}</div>
                        </td>
                        <td><RatingBadge rating={f.overallRating} /></td>
                        <td>
                          {f.hasComplaint
                            ? <span className="badge badge-red">⚠ Yes</span>
                            : <span className="badge badge-green">✓ No</span>}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(f.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
