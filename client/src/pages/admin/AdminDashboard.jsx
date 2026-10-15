import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import { StatCard, LoadingSpinner, RatingBadge } from '../../components/UI';
import {
  MdPeople, MdFeedback, MdWarning, MdStar, MdTrendingUp, MdCheckCircle,
  MdPending, MdPeopleAlt, MdShoppingBag, MdCancel
} from 'react-icons/md';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/axios';
import { useNotifications } from '../../context/NotificationContext';

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
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [metrics, setMetrics] = useState(null);
  const [visitorTrend, setVisitorTrend] = useState([]);
  const [ratingDist, setRatingDist] = useState([]);
  const [staffPerf, setStaffPerf] = useState([]);
  const [complaintCats, setComplaintCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [m, t, r, s, c] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/visitor-trend?months=6'),
          api.get('/analytics/rating-distribution'),
          api.get('/analytics/staff-performance'),
          api.get('/analytics/complaint-categories'),
        ]);
        setMetrics(m.data);
        setVisitorTrend(t.data);
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
          <StatCard icon={<MdPeopleAlt />} label="Unique Customers" value={metrics?.totalCustomers}
            iconBg="rgba(124,58,237,0.15)" iconColor="#a78bfa" />
          <StatCard icon={<MdPeople />} label="Total Visits" value={metrics?.totalVisits}
            iconBg="rgba(6,182,212,0.15)" iconColor="#22d3ee" />
          <StatCard icon={<MdShoppingBag />} label="Converted Customers" value={metrics?.convertedCustomersCount ?? metrics?.purchasedVisits ?? 0}
            iconBg="rgba(16,185,129,0.15)" iconColor="#059669" />
          <StatCard icon={<MdCancel />} label="Not Purchased" value={metrics?.notPurchasedVisits ?? 0}
            iconBg="rgba(239,68,68,0.15)" iconColor="#dc2626" />
          <StatCard icon={<MdTrendingUp />} label="Conversion Rate"
            value={`${metrics?.conversionRate ?? 0}%`}
            iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <StatCard icon={<MdFeedback />} label="Total Feedback" value={metrics?.totalFeedback}
            iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <StatCard icon={<MdStar />} label="Avg. Rating"
            value={<span style={{ fontSize: 22 }}>{metrics?.avgRating} <span style={{ fontSize: 16 }}>/ 5</span></span>}
            iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" />
          <div onClick={() => navigate('/admin/complaints')} style={{ cursor: 'pointer' }} title="Click to view Complaints Report & Date Filters">
            <StatCard icon={<MdWarning />} label="Complaints" value={metrics?.totalComplaints}
              iconBg="rgba(239,68,68,0.15)" iconColor="#f87171" />
          </div>
        </div>

        {/* Visit ↔ Customer Accuracy Info Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', marginBottom: 8, marginTop: 4,
          background: metrics?.totalCustomers === metrics?.totalVisits
            ? 'linear-gradient(90deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))'
            : 'linear-gradient(90deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05))',
          border: `1px solid ${metrics?.totalCustomers === metrics?.totalVisits ? 'rgba(16,185,129,0.25)' : 'rgba(124,58,237,0.2)'}`,
          borderRadius: 10, fontSize: 13,
        }} className="fade-in">
          <span style={{ fontSize: 16 }}>{metrics?.totalCustomers === metrics?.totalVisits ? '✅' : 'ℹ️'}</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{metrics?.totalCustomers}</strong> unique customer{metrics?.totalCustomers !== 1 ? 's' : ''} made{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{metrics?.totalVisits}</strong> visit{metrics?.totalVisits !== 1 ? 's' : ''} &bull;{' '}
            <strong style={{ color: '#059669' }}>{metrics?.convertedCustomersCount ?? metrics?.purchasedVisits ?? 0} converted customer{metrics?.convertedCustomersCount !== 1 ? 's' : ''}</strong> ({metrics?.conversionRate ?? 0}% conversion rate).
            {metrics?.totalVisits > metrics?.totalCustomers
              ? ` ${metrics.totalVisits - metrics.totalCustomers} visit(s) are repeat showroom visits from existing customers.`
              : ' Every customer is a first-time visitor.'}
          </span>
        </div>

        {/* Repeat Visitors Alert Banner */}
        {metrics?.repeatCustomersCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', marginBottom: 16, marginTop: 4,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(124,58,237,0.06) 100%)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 12, fontSize: 13, flexWrap: 'wrap', gap: 10,
          }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: 14 }}>
                  Repeat Visitor Alert: {metrics.repeatCustomersCount} customer{metrics.repeatCustomersCount !== 1 ? 's' : ''} visited 2 or 3 times to our showroom!
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                  Why do they return? Common reasons: Price negotiation, bringing family for approval, or tile shortage.
                </div>
              </div>
            </div>
            <a href="/admin/analytics" className="btn btn-sm btn-primary" style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none' }}>
              View Repeat Reasons & Journeys →
            </a>
          </div>
        )}

        {/* Live Customer Feedback & Complaint Notifications Feed */}
        {notifications.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(6,182,212,0.04) 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
          }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14, color: 'var(--accent-purple)' }}>
                <span style={{ fontSize: 18 }}>🔔</span> Latest Customer Feedback & Complaints
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>
                    {unreadCount} New
                  </span>
                )}
              </div>
              <Link to="/feedback" style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, textDecoration: 'none' }}>
                View All Feedbacks →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              {notifications.slice(0, 3).map((n) => (
                <div
                  key={n._id}
                  onClick={() => { markAsRead(n._id); navigate(n.link || '/feedback'); }}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${n.unread ? 'rgba(124,58,237,0.35)' : 'var(--border-glass)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: n.unread ? '0 4px 12px rgba(124,58,237,0.08)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: n.type === 'complaint' ? '#dc2626' : '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {n.type === 'complaint' ? '🚨 Complaint' : '⭐ Feedback'}
                    </span>
                    {n.unread && (
                      <span style={{ fontSize: 10, background: 'rgba(124,58,237,0.1)', color: 'var(--accent-purple)', fontWeight: 700, padding: '1px 6px', borderRadius: 6 }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Click to review
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="analytics-grid" style={{ marginBottom: 20 }}>
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">👥 Customers Visited (Last 6 Months)</span>
            </div>
            <div className="card-body chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitorTrend} barCategoryGap="35%" margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.1)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#8b8baf', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#8b8baf', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff', border: '1px solid #e2d9f3',
                      borderRadius: 8, fontSize: 12,
                      boxShadow: '0 4px 12px rgba(100,60,200,0.15)'
                    }}
                    formatter={(value) => [value, 'Customers Visited']}
                  />
                  <Bar
                    dataKey="customersVisited"
                    name="Customers Visited"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                    minPointSize={6}
                    label={{ position: 'top', fontSize: 11, fill: '#8b8baf', formatter: (v) => v > 0 ? v : '0' }}
                  >
                    {visitorTrend.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#7c3aed' : '#06b6d4'} fillOpacity={visitorTrend[i]?.customersVisited === 0 ? 0.35 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">⭐ Rating Distribution</span>
            </div>
            <div className="card-body" style={{ padding: '16px 12px 12px' }}>
              {/* Compact donut — no external labels that overflow on mobile */}
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ratingDist}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      dataKey="value" nameKey="name"
                      paddingAngle={3}
                    >
                      {ratingDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff', border: '1px solid var(--border-glass)',
                        borderRadius: 8, fontSize: 12,
                        boxShadow: '0 4px 12px rgba(100,60,200,0.12)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom compact legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'center', marginTop: 8 }}>
                {ratingDist.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: COLORS[i % COLORS.length], flexShrink: 0,
                      display: 'inline-block'
                    }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {entry.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({entry.value})</span>
                    </span>
                  </div>
                ))}
              </div>
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
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">🔴 Complaint Categories</span>
              <Link to="/admin/complaints" className="btn btn-xs btn-outline" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none' }}>
                Complaints Report & Filters →
              </Link>
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
