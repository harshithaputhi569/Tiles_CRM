import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  MdShoppingBag, MdCancel, MdTrendingUp, MdPeople, MdFilterList,
  MdShare, MdSearch, MdBarChart, MdFeedback, MdCheckCircle, MdAutorenew, MdHistory
} from 'react-icons/md';
import api from '../../api/axios';

const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

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
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>{typeof p.value === 'number' ? (p.value % 1 === 0 ? p.value : p.value.toFixed(2)) : p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('repeats'); // 'repeats' | 'purchases' | 'feedback'

  // Date filters
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysAgoStr = (numDays) => {
    const d = new Date();
    d.setDate(d.getDate() - numDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getMonthStartStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [startDate, setStartDate] = useState(() => getDaysAgoStr(30));
  const [endDate, setEndDate] = useState(() => getTodayStr());
  const [activePreset, setActivePreset] = useState('30d');

  // Purchase analytics state
  const [purchaseData, setPurchaseData] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [visitStatusFilter, setVisitStatusFilter] = useState('all');
  const [visitSourceFilter, setVisitSourceFilter] = useState('all');
  const [visitSearch, setVisitSearch] = useState('');

  // Repeat visitors state
  const [repeatData, setRepeatData] = useState(null);
  const [repeatLoading, setRepeatLoading] = useState(true);
  const [repeatFilter, setRepeatFilter] = useState('all'); // 'all' | '2' | '3' | 'purchased' | 'notPurchased'
  const [repeatSearch, setRepeatSearch] = useState('');

  // Feedback analytics state
  const [trend, setTrend] = useState([]);
  const [ratingDist, setRatingDist] = useState([]);
  const [staffPerf, setStaffPerf] = useState([]);
  const [complaintCats, setComplaintCats] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  const applyPreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'today') {
      const today = getTodayStr();
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'month') {
      setStartDate(getMonthStartStr());
      setEndDate(getTodayStr());
    } else if (preset === '30d') {
      setStartDate(getDaysAgoStr(30));
      setEndDate(getTodayStr());
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchPurchaseAnalytics = async () => {
    setPurchaseLoading(true);
    try {
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';

      const { data } = await api.get(`/analytics/purchase-conversion${qs}`);
      setPurchaseData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const fetchRepeatAnalytics = async () => {
    setRepeatLoading(true);
    try {
      const { data } = await api.get('/analytics/repeat-visitors');
      setRepeatData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRepeatLoading(false);
    }
  };

  const fetchFeedbackAnalytics = async () => {
    setFeedbackLoading(true);
    try {
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';

      const [t, r, s, c] = await Promise.all([
        api.get(`/analytics/feedback-trend${qs}`),
        api.get(`/analytics/rating-distribution${qs}`),
        api.get(`/analytics/staff-performance${qs}`),
        api.get(`/analytics/complaint-categories${qs}`),
      ]);
      setTrend(t.data.map(d => ({ date: d._id?.slice(5), count: d.count, rating: parseFloat(d.avgRating?.toFixed(2)) })));
      setRatingDist(r.data.map(d => ({ name: `${d._id}★`, value: d.count })));
      setStaffPerf(s.data.slice(0, 6));
      setComplaintCats(c.data);
    } catch { }
    finally { setFeedbackLoading(false); }
  };

  useEffect(() => {
    fetchPurchaseAnalytics();
    fetchRepeatAnalytics();
    fetchFeedbackAnalytics();
  }, [startDate, endDate]);

  const dateLabel = startDate && endDate
    ? `${startDate} to ${endDate}`
    : startDate
    ? `From ${startDate}`
    : endDate
    ? `Up to ${endDate}`
    : 'All Time';

  const radarData = staffPerf.slice(0, 1).length > 0 ? [
    { subject: 'Behaviour', A: staffPerf[0]?.avgBehaviour * 20 },
    { subject: 'Helpfulness', A: staffPerf[0]?.avgHelpfulness * 20 },
    { subject: 'Product Knowledge', A: staffPerf[0]?.avgProductKnowledge * 20 },
    { subject: 'Avg Rating', A: staffPerf[0]?.avgRating * 20 },
  ] : [];

  // Filtered recent visits for the purchases table
  const filteredVisits = (purchaseData?.recentVisits || []).filter((v) => {
    const matchStatus = visitStatusFilter === 'all' || v.purchaseStatus === visitStatusFilter;
    const matchSource = visitSourceFilter === 'all' || v.source === visitSourceFilter;
    const q = visitSearch.toLowerCase();
    const matchSearch =
      !q ||
      v.customer?.name?.toLowerCase().includes(q) ||
      v.customer?.mobile?.includes(q) ||
      v.staff?.name?.toLowerCase().includes(q);
    return matchStatus && matchSource && matchSearch;
  });

  // Filtered repeat visitors list
  const filteredRepeatVisitors = (repeatData?.repeatVisitors || []).filter((rv) => {
    const q = repeatSearch.toLowerCase();
    const matchSearch =
      !q ||
      rv.customerName.toLowerCase().includes(q) ||
      rv.mobile.includes(q) ||
      rv.latestRepeatReason.toLowerCase().includes(q);

    let matchType = true;
    if (repeatFilter === '2') matchType = rv.totalVisits === 2;
    else if (repeatFilter === '3') matchType = rv.totalVisits >= 3;
    else if (repeatFilter === 'purchased') matchType = rv.converted;
    else if (repeatFilter === 'notPurchased') matchType = !rv.converted;

    return matchSearch && matchType;
  });

  return (
    <>
      <Topbar title="Analytics & Insights" subtitle="Repeat customer alerts, reasons, conversions & showroom performance" />
      <div className="page-content">

        {/* Section Header with Tabs & Date Filter */}
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'repeats' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={() => setActiveTab('repeats')}
              >
                <MdAutorenew style={{ fontSize: 18 }} />
                <span>🔁 Repeat Visitors (2 & 3 Visits)</span>
                {repeatData?.totalRepeatCustomers > 0 && (
                  <span style={{
                    background: activeTab === 'repeats' ? '#ffffff' : '#7c3aed',
                    color: activeTab === 'repeats' ? '#7c3aed' : '#ffffff',
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 800,
                  }}>
                    {repeatData.totalRepeatCustomers}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'purchases' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={() => setActiveTab('purchases')}
              >
                <MdShoppingBag style={{ fontSize: 17 }} />
                <span>Customer Purchases & Sources</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'feedback' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onClick={() => setActiveTab('feedback')}
              >
                <MdFeedback style={{ fontSize: 17 }} />
                <span>Customer Feedback & Ratings</span>
              </button>
            </div>
            <div className="section-subtitle">
              {activeTab === 'repeats'
                ? 'Track customers who visited 2 or 3 times, why they returned, and their complete visit journey'
                : activeTab === 'purchases'
                ? 'Track purchased vs non-purchased customers, non-purchase reasons, and lead sources'
                : 'Customer satisfaction metrics, rating distributions, and showroom trends'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 520 }}>
            {/* Quick Preset Buttons */}
            <div className="analytics-presets" style={{ background: '#eef2f6', padding: '3px 4px', borderRadius: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${activePreset === 'today' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
                onClick={() => applyPreset('today')}
              >
                Today
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activePreset === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
                onClick={() => applyPreset('month')}
              >
                This Month
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activePreset === '30d' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
                onClick={() => applyPreset('30d')}
              >
                Last 30 Days
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activePreset === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
                onClick={() => applyPreset('all')}
              >
                All Time
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-glass)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                📅 Date Range:
              </span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '4px 8px', fontSize: 12, flex: '1 1 115px', border: '1px solid #d1d5db', borderRadius: 6, background: '#f8fafc' }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                title="Start Date"
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '4px 8px', fontSize: 12, flex: '1 1 115px', border: '1px solid #d1d5db', borderRadius: 6, background: '#f8fafc' }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                title="End Date"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: REPEAT VISITORS (2 & 3+ VISITS)                         */}
        {/* ============================================================== */}
        {activeTab === 'repeats' && (
          repeatLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Stat Cards Strip */}
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                {/* Total Repeat Customers */}
                <div className="stat-card" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
                    <MdAutorenew style={{ color: '#d97706', fontSize: 24 }} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#d97706' }}>
                      {repeatData?.totalRepeatCustomers ?? 0}
                    </div>
                    <div className="stat-label">Repeat Customers (2+ Visits)</div>
                  </div>
                </div>

                {/* 2 Visits */}
                <div className="stat-card" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.1)' }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed' }}>2x</span>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{repeatData?.twoVisitsCount ?? 0}</div>
                    <div className="stat-label">Visited Exactly 2 Times</div>
                  </div>
                </div>

                {/* 3+ Visits */}
                <div className="stat-card" style={{ borderColor: 'rgba(6,182,212,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#0891b2' }}>3x</span>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#0891b2' }}>
                      {repeatData?.threeVisitsCount ?? 0}
                    </div>
                    <div className="stat-label">Visited 3 or More Times</div>
                  </div>
                </div>

                {/* Repeat Conversion Rate */}
                <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <MdTrendingUp style={{ color: '#059669', fontSize: 24 }} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#059669' }}>
                      {repeatData?.repeatConversionRate ?? 0}%
                    </div>
                    <div className="stat-label">
                      Purchased on Return ({repeatData?.convertedCount ?? 0}/{repeatData?.totalRepeatCustomers ?? 0})
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational Callout / Pro Tip */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 12,
                  marginBottom: 24,
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(124,58,237,0.06) 100%)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                className="fade-in"
              >
                <span style={{ fontSize: 26 }}>🔔</span>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#92400e' }}>Why track repeat customers?</strong> When a customer visits a{' '}
                  <strong>2nd or 3rd time</strong>, they have high purchase intent (price negotiation, bringing family for approval, or tile shortage).
                  Reviewing their previous non-purchase reasons ensures staff addresses their exact objections and converts the sale.
                </div>
              </div>

              {/* Repeat Visit Reasons Breakdown Chart */}
              <div className="card fade-in" style={{ marginBottom: 24 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="card-title">❓ Why Did Customers Return for Visit 2 or 3?</span>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Reasons logged by staff when customers came back
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'rgba(245,158,11,0.12)',
                    color: '#b45309',
                    fontWeight: 700,
                    fontSize: 12,
                  }}>
                    {repeatData?.repeatReasonsBreakdown?.length || 0} Repeat Reasons Logged
                  </span>
                </div>

                <div className="card-body">
                  {(!repeatData?.repeatReasonsBreakdown || repeatData.repeatReasonsBreakdown.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                      No repeat visits logged yet. Register a visit for an existing customer to see reasons.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                      {repeatData.repeatReasonsBreakdown.map((r, idx) => {
                        const colors = ['#f59e0b', '#7c3aed', '#06b6d4', '#10b981', '#ec4899', '#f97316'];
                        const color = colors[idx % colors.length];

                        return (
                          <div
                            key={r.reason}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 10,
                              background: '#ffffff',
                              border: `1px solid ${color}35`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {r.reason}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: `${color}18`,
                                color,
                                fontWeight: 800,
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                              }}>
                                {r.count} return{r.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, (r.count / (repeatData.totalRepeatCustomers || 1)) * 100)}%`,
                                  height: '100%',
                                  background: color,
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Repeat Visitors Journey Feed */}
              <div className="card fade-in">
                <div
                  className="card-header"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
                >
                  <div>
                    <span className="card-title">📜 Repeat Visitors Journey Log (Why They Returned & What Happened)</span>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Showing {filteredRepeatVisitors.length} repeat customer histories
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', minWidth: 160 }}>
                      <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }} />
                      <input
                        className="form-control"
                        placeholder="Search customer, reason..."
                        value={repeatSearch}
                        onChange={(e) => setRepeatSearch(e.target.value)}
                        style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                      />
                    </div>

                    <select
                      className="form-control"
                      value={repeatFilter}
                      onChange={(e) => setRepeatFilter(e.target.value)}
                      style={{ height: 34, fontSize: 12, width: 170 }}
                    >
                      <option value="all">All Repeat Visitors</option>
                      <option value="2">Visited Exactly 2 Times</option>
                      <option value="3">Visited 3+ Times</option>
                      <option value="purchased">Converted (Purchased)</option>
                      <option value="notPurchased">Not Purchased Yet</option>
                    </select>
                  </div>
                </div>

                <div className="card-body">
                  {filteredRepeatVisitors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      No repeat customers match the filter.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {filteredRepeatVisitors.map((rv) => (
                        <div
                          key={rv.customerId}
                          style={{
                            background: '#ffffff',
                            borderRadius: 12,
                            border: rv.totalVisits >= 3 ? '2px solid rgba(6,182,212,0.3)' : '1px solid rgba(124,58,237,0.15)',
                            padding: '16px 20px',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                          }}
                        >
                          {/* Top Row: Customer Info & Status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                                  {rv.customerName}
                                </span>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: 12,
                                  background: rv.totalVisits >= 3 ? 'rgba(6,182,212,0.12)' : 'rgba(124,58,237,0.1)',
                                  color: rv.totalVisits >= 3 ? '#0891b2' : '#7c3aed',
                                  fontWeight: 800,
                                  fontSize: 12,
                                }}>
                                  🔁 Visited {rv.totalVisits} Times
                                </span>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: 12,
                                  background: rv.converted ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                  color: rv.converted ? '#059669' : '#dc2626',
                                  fontWeight: 800,
                                  fontSize: 12,
                                }}>
                                  {rv.converted ? '✓ Purchased' : '⏳ In Decision'}
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                📱 {rv.mobile} · {rv.customerType} · Source: {rv.source}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Latest Return Reason:</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: 8, marginTop: 2 }}>
                                {rv.latestRepeatReason}
                              </div>
                            </div>
                          </div>

                          {/* Chronological Visit Stepper Timeline */}
                          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                              Visit Timeline ({rv.totalVisits} Visits Logged):
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rv.visits.length}, 1fr)`, gap: 12 }}>
                              {rv.visits.map((v, idx) => (
                                <div
                                  key={v.visitId}
                                  style={{
                                    background: '#ffffff',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 800, color: '#7c3aed' }}>
                                      Visit #{v.visitNumber || idx + 1}
                                    </span>
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: 6,
                                      background: v.purchaseStatus === 'Purchased' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                      color: v.purchaseStatus === 'Purchased' ? '#059669' : '#dc2626',
                                    }}>
                                      {v.purchaseStatus === 'Purchased' ? 'Purchased' : 'Not Purchased'}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    📅 {new Date(v.date).toLocaleDateString('en-IN')}
                                  </div>
                                  <div style={{ marginTop: 4 }}>
                                    <strong>Purpose:</strong> {v.purpose}
                                  </div>

                                  {/* If visit 1 had a non-purchase reason */}
                                  {v.purchaseStatus === 'Not Purchased' && v.nonPurchaseReason && (
                                    <div style={{ color: '#dc2626', fontWeight: 600, fontSize: 11, marginTop: 4 }}>
                                      ⚠️ Didn't buy: {v.nonPurchaseReason}
                                    </div>
                                  )}

                                  {/* If visit 2 or 3 has a repeat reason */}
                                  {idx > 0 && v.repeatReason && (
                                    <div style={{ color: '#b45309', fontWeight: 600, fontSize: 11, marginTop: 4 }}>
                                      🔁 Why they came back: {v.repeatReason}
                                    </div>
                                  )}

                                  {v.notes && (
                                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11, marginTop: 4 }}>
                                      "{v.notes}"
                                    </div>
                                  )}

                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                                    Staff: {v.staffName}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        )}

        {/* ============================================================== */}
        {/* TAB 2: PURCHASES & LEAD SOURCES                                */}
        {/* ============================================================== */}
        {activeTab === 'purchases' && (
          purchaseLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Stat Cards Strip */}
              <div className="stats-grid" style={{ marginBottom: 24 }}>
                {/* Total Visitors */}
                <div className="stat-card" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.1)' }}>
                    <MdPeople style={{ color: '#7c3aed', fontSize: 24 }} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{purchaseData?.totalVisits ?? 0}</div>
                    <div className="stat-label">Total Visits ({dateLabel})</div>
                  </div>
                </div>

                {/* Converted Customers */}
                <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>
                    <MdShoppingBag style={{ color: '#059669', fontSize: 24 }} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#059669' }}>
                      {purchaseData?.convertedCustomersCount ?? purchaseData?.purchasedCount ?? 0}
                    </div>
                    <div className="stat-label">
                      Converted Customers{' '}
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        ({purchaseData?.totalVisits > 0 ? ((purchaseData.purchasedCount / purchaseData.totalVisits) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Billing */}
                <div className="stat-card" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <span style={{ fontSize: 20 }}>💰</span>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#047857' }}>
                      ₹{Number(purchaseData?.totalBillingValue || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="stat-label">Total Billing Value</div>
                  </div>
                </div>

                {/* Not Purchased */}
                <div className="stat-card" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
                    <MdCancel style={{ color: '#dc2626', fontSize: 24 }} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#dc2626' }}>
                      {purchaseData?.notPurchasedCount ?? 0}
                    </div>
                    <div className="stat-label">
                      Not Purchased{' '}
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>
                        ({purchaseData?.totalVisits > 0 ? ((purchaseData.notPurchasedCount / purchaseData.totalVisits) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="stat-card" style={{ borderColor: 'rgba(6,182,212,0.25)' }}>
                  <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
                    <MdTrendingUp style={{ color: '#0891b2', fontSize: 24 }} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-value" style={{ color: '#0891b2' }}>
                      {purchaseData?.conversionRate ?? 0}%
                    </div>
                    <div className="stat-label">Purchase Conversion Rate</div>
                  </div>
                </div>
              </div>

              {/* Main Visuals: Reasons Breakdown & Sources Breakdown */}
              <div className="analytics-grid" style={{ marginBottom: 24 }}>
                {/* 1. Reasons for Not Purchasing */}
                <div className="card fade-in">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="card-title">❌ Why Customers Did Not Purchase</span>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Reason breakdown for {purchaseData?.notPurchasedCount ?? 0} non-purchased visits
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: 'rgba(239,68,68,0.1)', color: '#dc2626',
                      fontWeight: 700, fontSize: 11
                    }}>
                      {purchaseData?.reasonsBreakdown?.length || 0} Distinct Reasons
                    </span>
                  </div>

                  <div className="card-body">
                    {(!purchaseData?.reasonsBreakdown || purchaseData.reasonsBreakdown.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        🎉 No non-purchased customer visits recorded in this period!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {purchaseData.reasonsBreakdown.map((r, idx) => {
                          const barColors = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
                          const color = barColors[idx % barColors.length];

                          return (
                            <div key={r.reason} style={{ background: 'rgba(124,58,237,0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.07)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {r.reason}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    fontSize: 13, fontWeight: 800, color,
                                    background: `${color}18`, padding: '2px 8px', borderRadius: 12,
                                  }}>
                                    {r.count} visit{r.count !== 1 ? 's' : ''}
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', minWidth: 42, textAlign: 'right' }}>
                                    {r.percentage}%
                                  </span>
                                </div>
                              </div>
                              <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{
                                  width: `${r.percentage}%`,
                                  height: '100%',
                                  background: color,
                                  borderRadius: 3,
                                  transition: 'width 0.6s ease',
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Customer Referral Channels */}
                <div className="card fade-in">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="card-title">📣 How Customers Found Our Shop</span>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Lead source performance & purchase conversion rate
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: 'rgba(124,58,237,0.1)', color: '#7c3aed',
                      fontWeight: 700, fontSize: 11
                    }}>
                      {purchaseData?.sourcesBreakdown?.length || 0} Channels
                    </span>
                  </div>

                  <div className="card-body">
                    {(!purchaseData?.sourcesBreakdown || purchaseData.sourcesBreakdown.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        No lead source data available for this range.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {purchaseData.sourcesBreakdown.map((s) => {
                          const channelIcons = {
                            'Social Media': '📱',
                            'Friends & Family': '👥',
                            'Google / Online Search': '🔍',
                            'Architect / Interior Designer': '📐',
                            'Builder / Contractor Referral': '🏗️',
                            'Walk-in / Signboard': '🚶',
                            'Other': '✨',
                          };
                          const icon = channelIcons[s.source] || '📍';

                          return (
                            <div key={s.source} style={{
                              padding: '12px 14px',
                              borderRadius: 10,
                              background: '#ffffff',
                              border: '1px solid rgba(124,58,237,0.1)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 18 }}>{icon}</span>
                                  <div>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                                      {s.source}
                                    </span>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                      {s.count} total customer{s.count !== 1 ? 's' : ''} ({s.percentage}% of all visits)
                                    </div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{
                                    fontSize: 14, fontWeight: 800,
                                    color: s.conversionRate >= 50 ? '#059669' : '#d97706'
                                  }}>
                                    {s.conversionRate}%
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Conversion</div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 7, background: '#fecaca', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                                  <div style={{
                                    width: `${s.conversionRate}%`,
                                    background: '#10b981',
                                    height: '100%',
                                    borderRadius: '4px 0 0 4px',
                                  }} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                  <b style={{ color: '#059669' }}>{s.purchased}</b> bought · <b style={{ color: '#dc2626' }}>{s.notPurchased}</b> left
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Conversion Comparison (Admin View) */}
              {purchaseData?.staffBreakdown?.length > 0 && (
                <div className="card fade-in" style={{ marginBottom: 24 }}>
                  <div className="card-header">
                    <span className="card-title">👥 Staff Purchase Conversion Leaderboard</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</span>
                  </div>
                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid rgba(124,58,237,0.1)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#7c3aed' }}>Staff Member</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>Visits Handled</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>Purchased</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>Not Purchased</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseData.staffBreakdown.map((s, idx) => (
                          <tr key={s._id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.staffName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.designation || 'Staff'}</div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{s.totalVisits}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>{s.purchased}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{s.notPurchased}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontWeight: 800,
                                fontSize: 12,
                                background: s.conversionRate >= 60 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                color: s.conversionRate >= 60 ? '#059669' : '#d97706',
                              }}>
                                {s.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Filterable Detailed Visits Table */}
              <div className="card fade-in">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span className="card-title">📋 Customer Visits & Purchase Outcome Log</span>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Showing {filteredVisits.length} visits matching your filters
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', minWidth: 160 }}>
                      <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }} />
                      <input
                        className="form-control"
                        placeholder="Search name, phone..."
                        value={visitSearch}
                        onChange={(e) => setVisitSearch(e.target.value)}
                        style={{ paddingLeft: 30, height: 34, fontSize: 12 }}
                      />
                    </div>

                    <select
                      className="form-control"
                      value={visitStatusFilter}
                      onChange={(e) => setVisitStatusFilter(e.target.value)}
                      style={{ height: 34, fontSize: 12, width: 140 }}
                    >
                      <option value="all">All Outcomes</option>
                      <option value="Purchased">Purchased</option>
                      <option value="Not Purchased">Not Purchased</option>
                    </select>

                    <select
                      className="form-control"
                      value={visitSourceFilter}
                      onChange={(e) => setVisitSourceFilter(e.target.value)}
                      style={{ height: 34, fontSize: 12, width: 160 }}
                    >
                      <option value="all">All Sources</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Friends & Family">Friends & Family</option>
                      <option value="Google / Online Search">Google Search</option>
                      <option value="Architect / Interior Designer">Architect/Designer</option>
                      <option value="Builder / Contractor Referral">Builder/Contractor</option>
                      <option value="Walk-in / Signboard">Walk-in / Signboard</option>
                    </select>
                  </div>
                </div>

                <div className="table-responsive">
                  {filteredVisits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No customer visits match the selected filter.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid rgba(124,58,237,0.1)' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#7c3aed' }}>Customer</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>Date</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#7c3aed' }}>Lead Source</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>Status</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#7c3aed' }}>Reason (If Not Purchased)</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#7c3aed' }}>Staff</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVisits.map((v, idx) => (
                          <tr key={v._id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.customer?.name || 'Customer'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.customer?.mobile || '—'} · {v.customer?.customerType || ''}</div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                              {new Date(v.visitDate || v.createdAt).toLocaleDateString('en-IN')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 12,
                                background: 'rgba(124,58,237,0.08)',
                                color: '#6d28d9',
                                fontSize: 11,
                                fontWeight: 600,
                              }}>
                                {v.source || 'Walk-in / Signboard'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontWeight: 700,
                                fontSize: 11,
                                background: v.purchaseStatus === 'Purchased' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                color: v.purchaseStatus === 'Purchased' ? '#059669' : '#dc2626',
                                border: `1px solid ${v.purchaseStatus === 'Purchased' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                              }}>
                                {v.purchaseStatus === 'Purchased' ? '✓ Purchased' : '✗ Not Purchased'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: v.nonPurchaseReason ? '#dc2626' : 'var(--text-muted)', fontWeight: v.nonPurchaseReason ? 600 : 400 }}>
                              {v.nonPurchaseReason || (v.purchaseStatus === 'Purchased' ? '—' : 'Not specified')}
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                              {v.staff?.name || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )
        )}

        {/* ============================================================== */}
        {/* TAB 3: FEEDBACK & RATINGS                                      */}
        {/* ============================================================== */}
        {activeTab === 'feedback' && (
          feedbackLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Trend Charts */}
              <div className="analytics-grid" style={{ marginBottom: 20 }}>
                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">📈 Feedback Volume Trend</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</span>
                  </div>
                  <div className="card-body chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="count" name="Feedback Count" stroke="#7c3aed" fill="url(#gCount)" strokeWidth={2.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">⭐ Avg Rating Trend</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</span>
                  </div>
                  <div className="card-body chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="gRating" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 5]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="rating" name="Avg Rating" stroke="#f59e0b" fill="url(#gRating)" strokeWidth={2.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="analytics-grid" style={{ marginBottom: 20 }}>
                {/* Rating Distribution */}
                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">📊 Rating Distribution</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</span>
                  </div>
                  <div className="card-body chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ratingDist}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#606080', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Feedbacks" radius={[6, 6, 0, 0]}>
                          {ratingDist.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Staff Leaderboard */}
                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">🏆 Staff Rating Ranking</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</span>
                  </div>
                  <div className="card-body chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerf} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis type="number" domain={[0, 5]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="avgRating" name="Avg Rating" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Charts Row 3 */}
              <div className="analytics-grid">
                {/* Complaint Categories */}
                {complaintCats.length > 0 && (
                  <div className="card fade-in">
                    <div className="card-header">
                      <span className="card-title">⚠️ Complaint Categories</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateLabel}</span>
                    </div>
                    <div className="card-body chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={complaintCats} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {complaintCats.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Radar Chart */}
                {radarData.length > 0 && (
                  <div className="card fade-in">
                    <div className="card-header">
                      <span className="card-title">🎯 Top Performer Breakdown</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{staffPerf[0]?.name}</span>
                    </div>
                    <div className="card-body chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.08)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#606080', fontSize: 11 }} />
                          <Radar name={staffPerf[0]?.name} dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        )}

      </div>
    </>
  );
}
