import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, ProgressBar } from '../../components/UI';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const REASON_CONFIG = {
  'High Price / Budget Constraint': {
    icon: '🏷️',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.2)',
    barColor: '#ef4444',
    tip: 'Offer budget collection or volume pricing',
  },
  'Just Exploring / Browsing': {
    icon: '👀',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.2)',
    barColor: '#f59e0b',
    tip: 'Send WhatsApp brochure or sample photos',
  },
  'Out of Stock / Lead Time': {
    icon: '📦',
    bg: 'rgba(6,182,212,0.06)',
    border: 'rgba(6,182,212,0.2)',
    barColor: '#06b6d4',
    tip: 'Propose similar available designs or check ETA',
  },
  'Better Competitor Offer': {
    icon: '⚖️',
    bg: 'rgba(168,85,247,0.06)',
    border: 'rgba(168,85,247,0.2)',
    barColor: '#a855f7',
    tip: 'Highlight TileShow warranty, finish & durability',
  },
  'Design / Quality Not Matched': {
    icon: '🎨',
    bg: 'rgba(236,72,153,0.06)',
    border: 'rgba(236,72,153,0.2)',
    barColor: '#ec4899',
    tip: 'Invite to view new premium slab arrival',
  },
};

export default function MyPerformance() {
  const { user } = useAuth();
  const [perf, setPerf] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDaysAgoStr = (numDays) => {
    const d = new Date();
    d.setDate(d.getDate() - numDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const applyPreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'today') { const t = getTodayStr(); setStartDate(t); setEndDate(t); }
    else if (preset === '7d') { setStartDate(getDaysAgoStr(7)); setEndDate(getTodayStr()); }
    else if (preset === '30d') { setStartDate(getDaysAgoStr(30)); setEndDate(getTodayStr()); }
    else if (preset === 'all') { setStartDate(''); setEndDate(''); }
  };

  useEffect(() => {
    setLoading(true);
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';

    Promise.all([
      api.get(`/feedback${qs}`),
      api.get(`/analytics/purchase-conversion${qs}`),
    ])
      .then(([fbRes, purRes]) => {
        const feedbacks = fbRes.data.feedbacks || [];
        setPurchaseData(purRes.data);

        const count = feedbacks.length;
        if (count === 0) {
          setPerf({
            feedbackCount: 0,
            visits: purRes.data?.totalVisits || 0,
            avgRating: '0',
            avgBehaviour: '0',
            avgHelpfulness: '0',
            avgProductKnowledge: '0',
            satisfactionRate: '0',
            complaints: 0,
            performanceScore: '0',
          });
          return;
        }

        const avgR = (key) => feedbacks.reduce((s, f) => s + f.ratings[key], 0) / count;
        const avgRating = feedbacks.reduce((s, f) => s + f.overallRating, 0) / count;
        const satisfaction = feedbacks.filter((f) => f.overallRating >= 4).length / count;
        const complaints = feedbacks.filter((f) => f.hasComplaint).length;

        const performanceScore =
          satisfaction * 30 +
          (avgR('behaviour') / 5) * 25 +
          (avgR('helpfulness') / 5) * 20 +
          (avgR('productKnowledge') / 5) * 15 +
          (complaints > 0 ? Math.max(0, 1 - complaints / count) : 1) * 10;

        setPerf({
          feedbackCount: count,
          avgRating: avgRating.toFixed(2),
          avgBehaviour: avgR('behaviour').toFixed(2),
          avgHelpfulness: avgR('helpfulness').toFixed(2),
          avgProductKnowledge: avgR('productKnowledge').toFixed(2),
          satisfactionRate: (satisfaction * 100).toFixed(1),
          complaints,
          performanceScore: performanceScore.toFixed(1),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const radarData = perf
    ? [
        { subject: 'Behaviour', value: parseFloat(perf.avgBehaviour || 0) * 20 },
        { subject: 'Helpfulness', value: parseFloat(perf.avgHelpfulness || 0) * 20 },
        { subject: 'Product\nKnowledge', value: parseFloat(perf.avgProductKnowledge || 0) * 20 },
        { subject: 'Satisfaction', value: parseFloat(perf.satisfactionRate || 0) },
        { subject: 'Avg Rating', value: parseFloat(perf.avgRating || 0) * 20 },
      ]
    : [];

  const metrics = perf
    ? [
        {
          label: 'Staff Behaviour',
          icon: '🤝',
          subText: 'Courtesy, greeting & professionalism',
          value: perf.avgBehaviour,
          max: 5,
          color: '#7c3aed',
        },
        {
          label: 'Helpfulness',
          icon: '💬',
          subText: 'Attentiveness & guiding customer needs',
          value: perf.avgHelpfulness,
          max: 5,
          color: '#06b6d4',
        },
        {
          label: 'Product Knowledge',
          icon: '💡',
          subText: 'Tile styles, specs & recommendations',
          value: perf.avgProductKnowledge,
          max: 5,
          color: '#ec4899',
        },
        {
          label: 'Customer Satisfaction',
          icon: '😊',
          subText: 'Feedback rated 4★ and 5★',
          value: `${perf.satisfactionRate}%`,
          raw: perf.satisfactionRate,
          max: 100,
          color: '#10b981',
        },
        {
          label: 'Purchase Conversion',
          icon: '🛍️',
          subText: 'Visits converted to successful orders',
          value: `${purchaseData?.conversionRate ?? 0}%`,
          raw: purchaseData?.conversionRate ?? 0,
          max: 100,
          color: '#8b5cf6',
        },
        {
          label: 'Avg. Overall Rating',
          icon: '⭐',
          subText: 'Cumulative average customer rating',
          value: perf.avgRating,
          max: 5,
          color: '#f59e0b',
        },
      ]
    : [];

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <Topbar title="My Performance" subtitle="Your personal performance & customer conversion metrics" />
      <div className="page-content">
        {loading ? (
          <LoadingSpinner />
        ) : !perf && !purchaseData ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Performance Data Yet</div>
            <div style={{ color: 'var(--text-muted)' }}>Start by registering customer visits and collecting feedback.</div>
          </div>
        ) : (
          <>
            {/* Period Filter Preset Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                Performance Period: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{activePreset === 'all' ? 'All Time (Overall)' : activePreset === '30d' ? 'Last 30 Days' : activePreset === '7d' ? 'Last 7 Days' : 'Today'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: '3px 4px', borderRadius: 8 }}>
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'all', label: 'All Time' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`btn btn-sm ${activePreset === p.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6 }}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Score Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '24px 28px',
                marginBottom: 24,
                background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.06) 100%)',
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: 'var(--radius-xl)',
                flexWrap: 'wrap',
              }}
              className="fade-in"
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: `conic-gradient(${getScoreColor(perf?.performanceScore || 75)} ${
                    perf?.performanceScore || 75
                  }%, rgba(255,255,255,0.05) 0)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 0 30px ${getScoreColor(perf?.performanceScore || 75)}40`,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 900, color: getScoreColor(perf?.performanceScore || 75) }}>
                    {perf?.performanceScore || '—'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5 }}>SCORE</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{user?.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {user?.designation || 'Staff Member'}
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>
                      {purchaseData?.totalVisits ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Visits Handled</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>
                      {purchaseData?.convertedCustomersCount ?? purchaseData?.purchasedCount ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Converted Customers</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#047857' }}>
                      ₹{Number(purchaseData?.totalBillingValue || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Billing</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>
                      {purchaseData?.notPurchasedCount ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not Purchased</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0891b2' }}>
                      {purchaseData?.conversionRate ?? 0}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Conversion</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>
                      {perf?.avgRating || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg Rating</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="analytics-grid">
              {/* Radar Chart */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">🎯 Performance Radar</span>
                </div>
                <div className="card-body chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(0,0,0,0.06)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#606080', fontSize: 11 }} />
                      <Radar name="Performance" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metric Bars */}
              <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">📊 Key Metrics Breakdown</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent-purple)',
                    background: 'rgba(124, 58, 237, 0.08)',
                    padding: '2px 8px',
                    borderRadius: 12,
                    border: '1px solid rgba(124, 58, 237, 0.15)'
                  }}>
                    6 KPIs
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px' }}>
                  {metrics.map((m) => {
                    const rawVal = parseFloat(m.raw ?? m.value) || 0;
                    const pct = Math.min(100, Math.max(0, (rawVal / m.max) * 100));

                    return (
                      <div
                        key={m.label}
                        style={{
                          padding: '11px 13px',
                          borderRadius: 12,
                          background: 'rgba(248, 250, 252, 0.8)',
                          border: '1px solid rgba(226, 232, 240, 0.9)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `${m.color}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 16,
                              flexShrink: 0
                            }}>
                              {m.icon}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {m.label}
                              </div>
                              <div style={{
                                fontSize: 11,
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {m.subText}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: 2,
                            padding: '3px 8px',
                            borderRadius: 8,
                            background: `${m.color}15`,
                            border: `1px solid ${m.color}35`,
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: m.color }}>
                              {m.value}
                            </span>
                            {m.max === 5 && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                                / 5.0
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visible High-Quality Progress Bar */}
                        <div style={{
                          width: '100%',
                          height: 6,
                          borderRadius: 999,
                          background: '#e2e8f0',
                          overflow: 'hidden',
                          position: 'relative',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 999,
                            background: `linear-gradient(90deg, ${m.color}cc 0%, ${m.color} 100%)`,
                            boxShadow: `0 0 6px ${m.color}50`,
                            transition: 'width 0.6s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Non-Purchase Reasons & Lead Sources for Staff */}
            {purchaseData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
                <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span className="card-title">❌ Reasons Why My Visitors Didn't Buy</span>
                      {purchaseData.notPurchasedCount > 0 && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: 'rgba(239,68,68,0.1)',
                          color: '#dc2626',
                          border: '1px solid rgba(239,68,68,0.25)',
                        }}>
                          {purchaseData.notPurchasedCount} Non-Purchased Visitors
                        </span>
                      )}
                    </div>
                    <div className="card-body">
                      {(!purchaseData.reasonsBreakdown || purchaseData.reasonsBreakdown.length === 0) ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 20px' }}>
                          <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
                          No non-purchased visitors recorded for this period. Great performance!
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {purchaseData.reasonsBreakdown.map((r) => {
                            const config = REASON_CONFIG[r.reason] || {
                              icon: '📌',
                              bg: 'rgba(241,245,249,0.7)',
                              border: '#e2e8f0',
                              barColor: '#ef4444',
                              tip: 'Follow up with customer to understand requirements',
                            };

                            return (
                              <div
                                key={r.reason}
                                style={{
                                  padding: '12px 14px',
                                  background: '#f8fafc',
                                  borderRadius: 10,
                                  border: `1px solid ${config.border}`,
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>{config.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{r.reason}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 800, fontSize: 12, color: '#dc2626' }}>
                                      {r.count} {r.count === 1 ? 'visitor' : 'visitors'}
                                    </span>
                                    <span style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      background: 'rgba(220,38,38,0.1)',
                                      color: '#dc2626',
                                      padding: '1px 6px',
                                      borderRadius: 6,
                                    }}>
                                      {r.percentage}%
                                    </span>
                                  </div>
                                </div>
                                <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                                  <div style={{ width: `${r.percentage}%`, height: '100%', background: `linear-gradient(90deg, ${config.barColor}, #dc2626)`, borderRadius: 3 }} />
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ color: '#d97706', fontSize: 12 }}>💡</span>
                                  <span><strong>Action:</strong> {config.tip}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Insight Card */}
                  <div style={{
                    margin: '0 16px 16px 16px',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(6,182,212,0.04) 100%)',
                    border: '1px dashed rgba(124,58,237,0.25)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <span>Reach out to non-purchased customers with alternative designs or special offers to recover potential sales.</span>
                  </div>
                </div>

                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">📣 How My Customers Found Us</span>
                  </div>
                  <div className="card-body">
                    {(!purchaseData.sourcesBreakdown || purchaseData.sourcesBreakdown.length === 0) ? (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                        No referral source data recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {purchaseData.sourcesBreakdown.map((s) => (
                          <div
                            key={s.source}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: '#f8fafc',
                              borderRadius: 8,
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{s.source}</span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                                {s.purchased} Purchased
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> / {s.count} total</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
