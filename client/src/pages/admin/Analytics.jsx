import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner } from '../../components/UI';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../api/axios';

const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

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
          <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [trend, setTrend] = useState([]);
  const [ratingDist, setRatingDist] = useState([]);
  const [staffPerf, setStaffPerf] = useState([]);
  const [complaintCats, setComplaintCats] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Date selection state with default date range (Last 30 days up to today)
  const [startDate, setStartDate] = useState(() => getDaysAgoStr(30));
  const [endDate, setEndDate] = useState(() => getTodayStr());
  const [activePreset, setActivePreset] = useState('30d');

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

  const fetchAll = async () => {
    setLoading(true);
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
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [startDate, endDate]);

  const radarData = staffPerf.slice(0, 1).length > 0 ? [
    { subject: 'Behaviour', A: staffPerf[0]?.avgBehaviour * 20 },
    { subject: 'Helpfulness', A: staffPerf[0]?.avgHelpfulness * 20 },
    { subject: 'Product Knowledge', A: staffPerf[0]?.avgProductKnowledge * 20 },
    { subject: 'Avg Rating', A: staffPerf[0]?.avgRating * 20 },
  ] : [];

  const dateLabel = startDate && endDate
    ? `${startDate} to ${endDate}`
    : startDate
    ? `From ${startDate}`
    : endDate
    ? `Up to ${endDate}`
    : 'All Time';

  return (
    <>
      <Topbar title="Analytics" subtitle="Deep insights into showroom performance" />
      <div className="page-content">

        {/* Controls */}
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="section-title">Performance Analytics</div>
            <div className="section-subtitle">Data-driven insights for your showroom</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: 6, background: '#eef2f6', padding: '3px 4px', borderRadius: 8 }}>
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
              padding: '4px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-glass)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                📅 Date:
              </span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto', border: '1px solid #d1d5db', borderRadius: 6, background: '#f8fafc' }}
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                title="Select From Date"
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto', border: '1px solid #d1d5db', borderRadius: 6, background: '#f8fafc' }}
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                title="Select To Date"
              />
            </div>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
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
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 5]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="rating" name="Avg Rating" stroke="#06b6d4" fill="url(#gRating)" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="analytics-grid-3" style={{ marginBottom: 20 }}>
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">⭐ Rating Distribution</span>
                </div>
                <div className="card-body chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={ratingDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                        dataKey="value" nameKey="name" paddingAngle={4}>
                        {ratingDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">🔴 Complaint Categories</span>
                </div>
                <div className="card-body chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintCats.map(c => ({ name: c._id, value: c.count }))}
                        cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                        {complaintCats.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">🎯 Top Staff Radar</span>
                </div>
                <div className="card-body chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a0a0c0', fontSize: 11 }} />
                      <Radar name={staffPerf[0]?.name || 'Staff'} dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Staff Comparison Bar Chart */}
            <div className="card fade-in">
              <div className="card-header">
                <span className="card-title">👥 Staff Performance Comparison</span>
              </div>
              <div className="card-body" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#a0a0c0', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fill: '#606080', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="avgRating" name="Avg Rating" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgBehaviour" name="Behaviour" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgHelpfulness" name="Helpfulness" fill="#ec4899" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avgProductKnowledge" name="Product Knowledge" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
