import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import { StatCard, LoadingSpinner, RatingBadge, StatusBadge } from '../../components/UI';
import {
  Users, MessageSquare, AlertTriangle, Star, TrendingUp, CheckCircle,
  UserCheck, ShoppingBag, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/axios';
import { useNotifications } from '../../context/NotificationContext';
import toast from 'react-hot-toast';

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
  const [unreadFeedbacks, setUnreadFeedbacks] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);

  const markFeedbackRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/feedback/${id}/read`, { isRead: true });
      setUnreadFeedbacks((prev) => prev.filter((f) => f._id !== id));
      toast.success('✓ Marked feedback as read');
    } catch {
      toast.error('Failed to update feedback');
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [m, t, r, s, c, fb, comp, stk] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/visitor-trend?months=6'),
          api.get('/analytics/rating-distribution'),
          api.get('/analytics/staff-performance'),
          api.get('/analytics/complaint-categories'),
          api.get('/feedback?unreadOnly=true&limit=6'),
          api.get('/complaints'),
          api.get('/analytics/stock-trend'),
        ]);
        setMetrics(m.data);
        setVisitorTrend(t.data);
        setRatingDist(r.data.map(d => ({ name: `${d._id}★`, value: d.count })));
        setStaffPerf(s.data.slice(0, 5));
        setComplaintCats(c.data);
        setUnreadFeedbacks(fb.data.feedbacks || []);
        setComplaints(comp.data || []);
        setStockData(stk.data || null);
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
          <StatCard icon={<Users size={20} />} label="Unique Customers" value={metrics?.totalCustomers}
            iconBg="rgba(124,58,237,0.15)" iconColor="#a78bfa" />
          <StatCard icon={<UserCheck size={20} />} label="Total Visits" value={metrics?.totalVisits}
            iconBg="rgba(6,182,212,0.15)" iconColor="#22d3ee" />
          <StatCard icon={<ShoppingBag size={20} />} label="Converted Customers" value={metrics?.convertedCustomersCount ?? metrics?.purchasedVisits ?? 0}
            iconBg="rgba(16,185,129,0.15)" iconColor="#059669" />
          <StatCard icon={<XCircle size={20} />} label="Not Purchased" value={metrics?.notPurchasedVisits ?? 0}
            iconBg="rgba(239,68,68,0.15)" iconColor="#dc2626" />
          <StatCard icon={<TrendingUp size={20} />} label="Conversion Rate"
            value={`${metrics?.conversionRate ?? 0}%`}
            iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <div onClick={() => navigate('/admin/feedback')} style={{ cursor: 'pointer' }} title="Click to open Customer Feedback Module">
            <StatCard icon={<MessageSquare size={20} />} label="Total Feedback" value={metrics?.totalFeedback}
              iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          </div>
          <StatCard icon={<Star size={20} />} label="Avg. Rating"
            value={<span style={{ fontSize: 22 }}>{metrics?.avgRating} <span style={{ fontSize: 16 }}>/ 5</span></span>}
            iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" />
          <div onClick={() => navigate('/admin/complaints')} style={{ cursor: 'pointer' }} title="Click to view Complaints Report & Date Filters">
            <StatCard icon={<AlertTriangle size={20} />} label="Complaints" value={metrics?.totalComplaints}
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

        {/* Live Customer Visits & Notifications Feed */}
        {notifications.filter((n) => (n.metadata?.customerName || '').toLowerCase() !== 'rajesh nair').length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(6,182,212,0.04) 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
          }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14, color: 'var(--accent-purple)' }}>
                <span style={{ fontSize: 18 }}>🔔</span> Live Customer Visits & Notifications
                {unreadCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>
                    {unreadCount} New
                  </span>
                )}
              </div>
              <Link to="/admin/notifications" style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, textDecoration: 'none' }}>
                View All Notifications →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              {notifications
                .filter((n) => (n.metadata?.customerName || '').toLowerCase() !== 'rajesh nair')
                .slice(0, 3)
                .map((n) => {
                  const isVisit = n.type === 'visit';
                  const isComplaint = n.type === 'complaint' || n.metadata?.hasComplaint;
                  const labelColor = isComplaint ? '#dc2626' : isVisit ? '#0891b2' : '#d97706';
                  const labelText = isComplaint
                    ? '🚨 Complaint'
                    : isVisit
                    ? n.metadata?.isRepeatVisit
                      ? '🔁 Repeat Visit'
                      : '👤 Customer Visit'
                    : '⭐ Feedback';

                  return (
                    <div
                      key={n._id}
                      onClick={() => {
                        markAsRead(n._id);
                        navigate(n.link || (isVisit ? '/admin/visits' : '/admin/notifications'));
                      }}
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: labelColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {labelText}
                        </span>
                        {n.unread && (
                          <span style={{ fontSize: 10, background: 'rgba(124,58,237,0.1)', color: 'var(--accent-purple)', fontWeight: 700, padding: '1px 6px', borderRadius: 6 }}>
                            NEW
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
                        <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.metadata?.customerMobile && (
                          <span style={{ fontWeight: 600, color: '#0891b2' }}>📞 {n.metadata.customerMobile}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Unread Customer Feedback Section (Only unread feedbacks shown on Dashboard) */}
        <div className="card fade-in" style={{ marginBottom: 20 }}>
          <div
            className="card-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="card-title">📩 Unread Customer Feedback</span>
              {unreadFeedbacks.length > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  {unreadFeedbacks.length} New
                </span>
              )}
            </div>
            <Link
              to="/admin/feedback"
              className="btn btn-xs btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            >
              Open Dedicated Feedback Module (All Feedbacks) →
            </Link>
          </div>

          {unreadFeedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                All Caught Up!
              </div>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                Only unread feedbacks display on the dashboard. You can view all records, filter by date, search, and pin reviews in the Feedback Module.
              </div>
              <Link to="/admin/feedback" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none' }}>
                Open Feedback Module ({metrics?.totalFeedback || 0} Total Reviews) →
              </Link>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Attending Staff</th>
                    <th>Rating</th>
                    <th>Comment Snippet</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unreadFeedbacks.map((f) => (
                    <tr key={f._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                          {f.customer?.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {f.customer?.mobile ? `📞 ${f.customer.mobile} · ` : ''}
                          {f.customer?.customerType || 'Customer'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {f.staff?.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {f.staff?.designation || 'Staff'}
                        </div>
                      </td>
                      <td>
                        <RatingBadge rating={f.overallRating} />
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontStyle: f.comments ? 'italic' : 'normal',
                          }}
                          title={f.comments || f.suggestions || 'No comment'}
                        >
                          {f.comments ? `"${f.comments}"` : f.suggestions ? `💡 ${f.suggestions}` : '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(f.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-xs btn-outline"
                          onClick={(e) => markFeedbackRead(f._id, e)}
                          style={{ fontSize: 11, padding: '3px 8px' }}
                          title="Mark as read and clear from dashboard"
                        >
                          ✓ Mark Read
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customer Complaints Section */}
        <div className="card fade-in" style={{ marginBottom: 20, border: '1px solid rgba(239,68,68,0.22)' }}>
          <div
            className="card-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626' }}>
                <AlertTriangle size={18} style={{ color: '#dc2626' }} />
                <span>⚠️ Customer Complaints</span>
              </span>
              {complaints.filter((c) => c.status !== 'Resolved').length > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  {complaints.filter((c) => c.status !== 'Resolved').length} Unresolved
                </span>
              )}
            </div>
            <Link
              to="/admin/complaints"
              className="btn btn-xs btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
            >
              Open Complaints Module ({complaints.length} Total) →
            </Link>
          </div>

          {complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                Zero Customer Complaints!
              </div>
              <div style={{ fontSize: 13 }}>
                All showroom visits and customer feedbacks have no pending complaints.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Attending Staff</th>
                    <th>Category</th>
                    <th>Complaint Description</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.slice(0, 5).map((c) => (
                    <tr key={c._id} style={{ background: c.status === 'Pending' ? 'rgba(239,68,68,0.02)' : 'transparent' }}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                          {c.customer?.name || 'Customer'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.customer?.mobile ? `📞 ${c.customer.mobile}` : '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {c.staff?.name || 'Staff'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.staff?.designation || ''}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: 'rgba(239,68,68,0.1)',
                            color: '#dc2626',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.category}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 500,
                          }}
                          title={c.description}
                        >
                          "{c.description}"
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link
                          to="/admin/complaints"
                          className="btn btn-xs btn-outline"
                          style={{ fontSize: 11, padding: '3px 8px', textDecoration: 'none' }}
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stock Availability & Fast Selling Stock Section */}
        <div className="analytics-grid" style={{ marginBottom: 20 }}>
          {/* Card 1: Stock Availability & Demand Trend (All Time) */}
          <div className="card fade-in" style={{
            background: '#ffffff',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(124,58,237,0.18)',
            boxShadow: '0 2px 10px rgba(124,58,237,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📦</span> Stock Availability & Demand Trend (All Time)
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    background: 'rgba(16,185,129,0.12)',
                    color: '#059669',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}>
                    ✓ {stockData?.availableCount ?? 0} In Stock ({stockData?.availabilityRate ?? 0}%)
                  </span>
                  {stockData?.outOfStockCount > 0 && (
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 800,
                      background: 'rgba(239,68,68,0.12)',
                      color: '#dc2626',
                      border: '1px solid rgba(239,68,68,0.3)',
                    }}>
                      ✗ {stockData.outOfStockCount} Out of Stock
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Showroom customer stock requests: In Stock (Yes) vs Out of Stock (No)
              </div>

              {/* Trend Chart: Available vs Out of Stock */}
              {(!stockData?.dailyTrend || stockData.dailyTrend.length === 0) ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                  No stock inquiries recorded.
                </div>
              ) : (
                <div style={{ height: 210, width: '100%', marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockData.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                      <Bar dataKey="available" name="Yes (Stock Available)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outOfStock" name="No (Stock Not Available)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* WHICH STOCK CUSTOMER ASKED MORE (Top Demand) */}
              <div style={{
                borderTop: '1px solid var(--border-glass)',
                paddingTop: 14,
                marginTop: 4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🔥</span> Which Stock Customers Asked More (Top Demand)
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Ranked by customer requests
                  </span>
                </div>

                {(!stockData?.mostAskedStocks || stockData.mostAskedStocks.length === 0) ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No stock inquiries logged yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stockData.mostAskedStocks.slice(0, 5).map((stk) => (
                      <div
                        key={stk.stockName}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: stk.isShortage ? 'rgba(239,68,68,0.04)' : '#f8fafc',
                          borderRadius: 8,
                          border: stk.isShortage ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: stk.rank === 1 ? '#7c3aed' : stk.rank === 2 ? '#0891b2' : '#64748b',
                            color: '#ffffff', fontSize: 11, fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {stk.rank}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                              {stk.stockName}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {stk.totalAsked} customer request{stk.totalAsked !== 1 ? 's' : ''} ({stk.demandPercentage}% of inquiries)
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'right' }}>
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: '#059669', fontWeight: 700 }}>✓ {stk.availableCount} In Stock</span>
                            {stk.outOfStockCount > 0 && (
                              <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 8 }}>
                                ✗ {stk.outOfStockCount} Out
                              </span>
                            )}
                          </div>
                          {stk.outOfStockCount > 0 ? (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 10,
                              fontWeight: 800,
                              background: 'rgba(239,68,68,0.12)',
                              color: '#dc2626',
                            }}>
                              Stock Shortage
                            </span>
                          ) : (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: 10,
                              fontWeight: 800,
                              background: 'rgba(16,185,129,0.12)',
                              color: '#059669',
                            }}>
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 12,
              color: 'var(--text-secondary)',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 10,
            }}>
              <span>💡 Total customer inquiries: <strong>{stockData?.totalInquiries || 0}</strong></span>
              <Link to="/admin/analytics" style={{ color: 'var(--accent-purple)', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                View Full Stock Analytics →
              </Link>
            </div>
          </div>

          {/* Card 2: Fast Selling Stock (Top Performing Tiles) */}
          <div className="card fade-in" style={{
            background: '#ffffff',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 2px 10px rgba(16,185,129,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 16,
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🚀</span> Fast Selling Stock (Top Performing Tiles)
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    background: 'rgba(16,185,129,0.12)',
                    color: '#059669',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}>
                    ⚡ {stockData?.fastSellingStocks?.length || 0} Fast Movers
                  </span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    background: 'rgba(124,58,237,0.1)',
                    color: '#7c3aed',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}>
                    {metrics?.convertedCustomersCount ?? metrics?.purchasedVisits ?? 0} Total Purchases
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Tile designs with highest sales conversions, order volume, and revenue velocity
              </div>

              {/* Fast Selling Summary KPI Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 16,
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.04) 100%)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Top Sold Tile</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#059669', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stockData?.fastSellingStocks?.[0]?.stockName}>
                    {stockData?.fastSellingStocks?.[0]?.stockName?.split(' ')[0] || 'GVT'} ⭐
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {stockData?.fastSellingStocks?.[0]?.soldCount || 0} orders
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(245,158,11,0.04) 100%)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Highest Conversion</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#7c3aed', marginTop: 2 }}>
                    {Math.max(...(stockData?.fastSellingStocks?.map((s) => s.conversionRate) || [0]))}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Inquiry to Purchase</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(16,185,129,0.04) 100%)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Stock Revenue</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0891b2', marginTop: 2 }}>
                    ₹{((stockData?.fastSellingStocks?.reduce((acc, s) => acc + (s.totalRevenue || 0), 0) || 0) / 100000).toFixed(1)}L
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Billing Value</div>
                </div>
              </div>

              {/* Fast Selling Stock List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(!stockData?.fastSellingStocks || stockData.fastSellingStocks.length === 0) ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                    No completed purchases recorded yet. As visitors purchase tiles, top-selling designs appear here.
                  </div>
                ) : (
                  stockData.fastSellingStocks.slice(0, 5).map((stk, idx) => {
                    const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                    const badgeBg = idx === 0 ? 'rgba(245,158,11,0.12)' : idx === 1 ? 'rgba(148,163,184,0.15)' : 'rgba(16,185,129,0.1)';
                    const badgeColor = idx === 0 ? '#b45309' : idx === 1 ? '#475569' : '#059669';

                    return (
                      <div
                        key={stk.stockName}
                        style={{
                          padding: '10px 14px',
                          background: '#f8fafc',
                          borderRadius: 10,
                          border: idx === 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(0,0,0,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 16 }}>{rankMedal}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                                {stk.stockName}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                <strong style={{ color: '#059669' }}>{stk.soldCount} orders sold</strong> · {stk.conversionRate}% purchase conversion
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                              ₹{stk.totalRevenue ? stk.totalRevenue.toLocaleString('en-IN') : '—'}
                            </div>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 10,
                              fontWeight: 800,
                              background: badgeBg,
                              color: badgeColor,
                              marginTop: 2,
                            }}>
                              {stk.status}
                            </span>
                          </div>
                        </div>

                        {/* Conversion & Demand Visual Progress Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            flex: 1,
                            height: 5,
                            background: '#e2e8f0',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.min(100, Math.max(15, stk.conversionRate))}%`,
                              height: '100%',
                              background: idx === 0 ? 'linear-gradient(90deg, #f59e0b, #10b981)' : '#10b981',
                              borderRadius: 4,
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                            {stk.salesShare}% share
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 12,
              color: 'var(--text-secondary)',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 10,
            }}>
              <span>⚡ Fast selling tiles generate highest showroom turnover</span>
              <Link to="/admin/analytics" style={{ color: '#059669', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                View Conversion Details →
              </Link>
            </div>
          </div>
        </div>

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
