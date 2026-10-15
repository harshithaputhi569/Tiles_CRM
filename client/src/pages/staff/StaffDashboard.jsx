import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import { StatCard, LoadingSpinner, RatingBadge, EmptyState } from '../../components/UI';
import {
  MdPeople, MdFeedback, MdStar, MdTrendingUp,
  MdShoppingBag, MdCancel, MdList, MdReceipt
} from 'react-icons/md';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid var(--border-glass)', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(100,60,200,0.12)' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
      </div>
    );
  }
  return null;
};

const PURCHASE_COLORS = {
  Purchased:      { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  'Not Purchased':{ bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  Interested:     { bg: 'rgba(245,158,11,0.12)',  color: '#b45309' },
};

export default function StaffDashboard() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [purchaseData, setPurchaseData] = useState(null);
  const [repeatData, setRepeatData] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('30d');
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysAgoStr = (numDays) => {
    const d = new Date();
    d.setDate(d.getDate() - numDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState(() => getDaysAgoStr(30));
  const [endDate, setEndDate] = useState(() => getTodayStr());

  const applyPreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'today') { const t = getTodayStr(); setStartDate(t); setEndDate(t); }
    else if (preset === '7d') { setStartDate(getDaysAgoStr(7)); setEndDate(getTodayStr()); }
    else if (preset === '30d') { setStartDate(getDaysAgoStr(30)); setEndDate(getTodayStr()); }
    else if (preset === 'all') { setStartDate(''); setEndDate(''); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';

      const [fbRes, purRes, repRes, visRes, stockRes] = await Promise.all([
        api.get('/feedback'),
        api.get(`/analytics/purchase-conversion${qs}`),
        api.get('/analytics/repeat-visitors'),
        api.get('/visits?limit=5'),
        api.get(`/analytics/stock-trend${qs}`),
      ]);
      setFeedbacks(fbRes.data.feedbacks || []);
      setPurchaseData(purRes.data);
      setRepeatData(repRes.data);
      setRecentVisits(visRes.data.visits || []);
      setStockData(stockRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const totalFeedback = feedbacks.length;
  const avgRating = totalFeedback > 0 ? (feedbacks.reduce((s, f) => s + f.overallRating, 0) / totalFeedback).toFixed(2) : 0;
  const satisfaction = totalFeedback > 0 ? ((feedbacks.filter(f => f.overallRating >= 4).length / totalFeedback) * 100).toFixed(1) : 0;
  const complaints = feedbacks.filter(f => f.hasComplaint).length;
  const todayStr = new Date().toDateString();
  const todayFeedback = feedbacks.filter(f => new Date(f.createdAt).toDateString() === todayStr).length;

  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const dayFbs = feedbacks.filter(f => new Date(f.createdAt).toDateString() === d.toDateString());
    const r = dayFbs.length > 0 ? (dayFbs.reduce((s, f) => s + f.overallRating, 0) / dayFbs.length).toFixed(1) : 0;
    return { label, count: dayFbs.length, rating: parseFloat(r) };
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14
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

        {/* Section 1: Purchase Conversion */}
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="card-title">🛒 My Customer Visits & Conversion</span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>See how many of your visitors purchased vs left without buying</div>
            </div>
            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: '3px 4px', borderRadius: 8 }}>
              {[{ id: 'today', label: 'Today' }, { id: '7d', label: '7 Days' }, { id: '30d', label: '30 Days' }, { id: 'all', label: 'All Time' }].map(p => (
                <button key={p.id} type="button"
                  className={`btn btn-sm ${activePreset === p.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }}
                  onClick={() => applyPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body">
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <StatCard icon={<MdPeople />} label="Visits Handled" value={purchaseData?.totalVisits ?? 0} iconBg="rgba(124,58,237,0.12)" iconColor="#7c3aed" />
              <StatCard icon={<MdShoppingBag />} label="Converted Customers" value={purchaseData?.convertedCustomersCount ?? purchaseData?.purchasedCount ?? 0} iconBg="rgba(16,185,129,0.12)" iconColor="#059669" />
              <StatCard icon={<MdReceipt />} label="Total Billing Value" value={purchaseData?.totalBillingValue > 0 ? `₹${Number(purchaseData.totalBillingValue).toLocaleString('en-IN')}` : '₹0'} iconBg="rgba(16,185,129,0.18)" iconColor="#047857" />
              <StatCard icon={<MdCancel />} label="Not Purchased" value={purchaseData?.notPurchasedCount ?? 0} iconBg="rgba(239,68,68,0.12)" iconColor="#dc2626" />
              <StatCard icon={<MdTrendingUp />} label="My Conversion Rate" value={`${purchaseData?.conversionRate ?? 0}%`} iconBg="rgba(6,182,212,0.12)" iconColor="#0891b2" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>❌ Why My Visitors Didn't Purchase</div>
                {(!purchaseData?.reasonsBreakdown || purchaseData.reasonsBreakdown.length === 0) ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No non-purchased visitors for this period.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {purchaseData.reasonsBreakdown.map(r => (
                      <div key={r.reason}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ fontWeight: 600 }}>{r.reason}</span>
                          <span style={{ fontWeight: 700, color: '#dc2626' }}>{r.count} ({r.percentage}%)</span>
                        </div>
                        <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${r.percentage}%`, height: '100%', background: '#ef4444', borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#7c3aed', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>📣 How My Visitors Found Us</div>
                {(!purchaseData?.sourcesBreakdown || purchaseData.sourcesBreakdown.length === 0) ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No source data recorded for this period.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {purchaseData.sourcesBreakdown.map(s => (
                      <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid rgba(0,0,0,0.04)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{s.source}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>{s.purchased} bought</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> / {s.count} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Repeat Visitor Alerts */}
        {repeatData?.totalRepeatCustomers > 0 && (
          <div className="card fade-in" style={{ marginBottom: 24, border: '1px solid rgba(245,158,11,0.35)' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>🔔</span>
                <div>
                  <span className="card-title" style={{ color: '#92400e' }}>Repeat Visitor Alerts ({repeatData.totalRepeatCustomers} Returning Customers)</span>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Customers who visited 2+ times and why they returned</div>
                </div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 700, fontSize: 12 }}>
                {repeatData.repeatConversionRate}% Converted on Return
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {repeatData.repeatVisitors.slice(0, 4).map((rv) => (
                  <div key={rv.customerId} style={{ padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{rv.customerName}</span>
                        <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800, background: rv.totalVisits >= 3 ? 'rgba(6,182,212,0.12)' : 'rgba(124,58,237,0.1)', color: rv.totalVisits >= 3 ? '#0891b2' : '#7c3aed' }}>
                          Visited {rv.totalVisits} Times
                        </span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📱 {rv.mobile} · Source: {rv.source}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Return Reason:</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 6, marginTop: 2 }}>{rv.latestRepeatReason}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
                      {rv.visits.map((v, i) => (
                        <div key={v.visitId} style={{ padding: '6px 10px', background: '#fff', borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)', flex: '1 1 180px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span style={{ color: '#7c3aed' }}>Visit #{v.visitNumber || i + 1}</span>
                            <span style={{ color: v.purchaseStatus === 'Purchased' ? '#059669' : '#dc2626' }}>{v.purchaseStatus === 'Purchased' ? '✓ Bought' : '✗ Left'}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{v.purpose}</div>
                          {v.purchaseStatus === 'Not Purchased' && v.nonPurchaseReason && (
                            <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 2 }}>Objection: {v.nonPurchaseReason}</div>
                          )}
                          {v.repeatReason && i > 0 && (
                            <div style={{ color: '#b45309', fontWeight: 600, marginTop: 2 }}>Return reason: {v.repeatReason}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Recent Visits (with feedback & complaint status) */}
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="card-title">📋 My Recent Visits</span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest 5 visits — click "View All" to manage and share feedback links</div>
            </div>
            <Link to="/staff/my-visits" className="btn btn-xs btn-outline" style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MdList /> View All →
            </Link>
          </div>
          {loading ? <LoadingSpinner /> : recentVisits.length === 0 ? (
            <EmptyState icon="📭" message="No visits yet" sub="Start by registering a customer visit" />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Customer</th><th>Visit Date</th><th>Purpose</th><th>Billing</th><th>Status</th><th>Feedback</th></tr>
                </thead>
                <tbody>
                  {recentVisits.map(v => {
                    const ps = PURCHASE_COLORS[v.purchaseStatus] || { bg: '#f1f5f9', color: '#64748b' };
                    return (
                      <tr key={v._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{v.customer?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📱 {v.customer?.mobile}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ fontSize: 12 }}>{v.purpose}</td>
                        <td>
                          {v.totalBillingValue > 0 ? (
                            <span style={{ fontWeight: 800, color: '#047857', fontSize: 12 }}>
                              ₹{Number(v.totalBillingValue).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ps.bg, color: ps.color }}>
                            {v.purchaseStatus === 'Purchased' ? '✓' : v.purchaseStatus === 'Interested' ? '◎' : '✗'} {v.purchaseStatus}
                          </span>
                        </td>
                        <td>
                          {v.feedbackSubmitted
                            ? <span className="badge badge-green">✓ Done</span>
                            : <span className="badge badge-purple">⏳ Pending</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 4: Feedback Stats */}
        <div className="stats-grid">
          <StatCard icon={<MdFeedback />} label="Total Feedback" value={totalFeedback} iconBg="rgba(124,58,237,0.15)" iconColor="#a78bfa" />
          <StatCard icon={<MdStar />} label="Avg. Rating" value={<span>{avgRating}<span style={{ fontSize: 14, fontWeight: 400 }}>/5</span></span>} iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" />
          <StatCard icon={<MdTrendingUp />} label="Satisfaction Rate" value={`${satisfaction}%`} iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" />
          <StatCard icon={<MdPeople />} label="Complaints Received" value={complaints} iconBg="rgba(239,68,68,0.15)" iconColor="#f87171" />
        </div>

        {/* Chart + Recent Feedback */}
        <div className="analytics-grid">
          {/* Section: Stock Availability & In-Demand Tiles Trend */}
          <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  📦 Stock Availability & Demand Trend (7 Days)
                </span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Daily customer stock requests: In Stock (Yes) vs Out of Stock (No)
                </div>
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
                  ✓ {stockData?.availabilityRate ?? 0}% Available
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

            <div className="card-body">
              {/* Daily Trend Chart: Yes (Available) vs No (Out of Stock) */}
              <div style={{ height: 210, width: '100%', marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockData?.dailyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

              {/* WHICH STOCK CUSTOMER ASKED MORE (Top In-Demand Tiles) */}
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
                    No stock inquiries logged yet. Record tile designs asked by customers during visits.
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
          </div>

          <div className="card fade-in">
            <div className="card-header"><span className="card-title">📋 Recent Feedback</span></div>
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
