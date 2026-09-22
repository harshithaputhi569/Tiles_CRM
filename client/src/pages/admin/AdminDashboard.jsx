import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { StatCard, LoadingSpinner, RatingBadge } from '../../components/UI';
import {
  MdPeople, MdFeedback, MdWarning, MdStar, MdTrendingUp, MdCheckCircle,
  MdPending, MdPeopleAlt
} from 'react-icons/md';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/axios';

const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#ffffff', border: '1px solid var(--border-glass)',
        borderRadius: 8, padding: '8px 12px', fontSize: 12,
        boxShadow: '0 4px 12px rgba(100,60,200,0.12)'
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [trend, setTrend] = useState([]);
  const [ratingDist, setRatingDist] = useState([]);
  const [staffPerf, setStaffPerf] = useState([]);
  const [complaintCats, setComplaintCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [m, t, r, s, c] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/feedback-trend?days=30'),
          api.get('/analytics/rating-distribution'),
          api.get('/analytics/staff-performance'),
          api.get('/analytics/complaint-categories'),
        ]);
        setMetrics(m.data);
        setTrend(t.data.map(d => ({ date: d._id?.slice(5), count: d.count, rating: parseFloat(d.avgRating?.toFixed(1)) })));
        setRatingDist(r.data.map(d => ({ name: `${d._id}★`, value: d.count })));
        setStaffPerf(s.data.slice(0, 5));
        setComplaintCats(c.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return <><Topbar title="Dashboard" subtitle="Overview" /><LoadingSpinner /></>;

  return (
    <>
      <Topbar title="Admin Dashboard" subtitle="TileShow CRM – Overview" />
      <div className="page-content">

        {/* Stat Cards */}
        <div className="stats-grid">
          <StatCard icon={<MdPeopleAlt />} label="Total Customers" value={metrics?.totalCustomers}
            iconBg="rgba(124,58,237,0.15)" iconColor="#a78bfa" />
          <StatCard icon={<MdPeople />} label="Total Visits" value={metrics?.totalVisits}
            iconBg="rgba(6,182,212,0.15)" iconColor="#22d3ee" />
          <StatCard icon={<MdFeedback />} label="Total Feedback" value={metrics?.totalFeedback}
            iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <StatCard icon={<MdStar />} label="Avg. Rating"
            value={<span style={{ fontSize: 22 }}>{metrics?.avgRating} <span style={{ fontSize: 16 }}>/ 5</span></span>}
            iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" />
          <StatCard icon={<MdTrendingUp />} label="Satisfaction Rate"
            value={`${metrics?.satisfactionRate}%`}
            iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <StatCard icon={<MdWarning />} label="Total Complaints" value={metrics?.totalComplaints}
            iconBg="rgba(239,68,68,0.15)" iconColor="#f87171" />
          <StatCard icon={<MdPending />} label="Pending Complaints" value={metrics?.pendingComplaints}
            iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" />
          <StatCard icon={<MdCheckCircle />} label="Active Staff" value={metrics?.activeStaff}
            iconBg="rgba(124,58,237,0.15)" iconColor="#8b5cf6" />
        </div>

        {/* Charts Row 1 */}
        <div className="analytics-grid" style={{ marginBottom: 20 }}>
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">📈 Feedback Trend (Last 30 Days)</span>
            </div>
            <div className="card-body chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="gradCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Feedback" stroke="#7c3aed" fill="url(#gradCount)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">⭐ Rating Distribution</span>
            </div>
            <div className="card-body chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ratingDist} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                    dataKey="value" nameKey="name" paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {ratingDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="analytics-grid">
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">👥 Staff Performance</span>
            </div>
            <div className="card-body chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#a0a0c0', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgRating" name="Avg Rating" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="avgBehaviour" name="Behaviour" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">🔴 Complaint Categories</span>
            </div>
            <div className="card-body chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintCats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="_id" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Complaints" fill="#ec4899" radius={[6, 6, 0, 0]}>
                    {complaintCats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Staff Leaderboard */}
        <div className="card fade-in" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">🏆 Staff Leaderboard</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Staff Member</th>
                  <th>Feedback Received</th>
                  <th>Avg. Rating</th>
                  <th>Behaviour</th>
                  <th>Helpfulness</th>
                  <th>Product Knowledge</th>
                </tr>
              </thead>
              <tbody>
                {staffPerf.map((s, i) => (
                  <tr key={s._id}>
                    <td>
                      <span style={{
                        fontWeight: 800, fontSize: 16,
                        color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : 'var(--text-muted)'
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.designation}</div>
                    </td>
                    <td>{s.feedbackCount}</td>
                    <td><RatingBadge rating={s.avgRating} /></td>
                    <td>{s.avgBehaviour?.toFixed(1)}</td>
                    <td>{s.avgHelpfulness?.toFixed(1)}</td>
                    <td>{s.avgProductKnowledge?.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
