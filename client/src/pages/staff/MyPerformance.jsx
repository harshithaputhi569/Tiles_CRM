import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, ProgressBar } from '../../components/UI';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function MyPerformance() {
  const { user } = useAuth();
  const [perf, setPerf] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/feedback'),
      api.get('/analytics/purchase-conversion'),
    ])
      .then(([fbRes, purRes]) => {
        const feedbacks = fbRes.data.feedbacks || [];
        setPurchaseData(purRes.data);

        const count = feedbacks.length;
        if (count === 0) {
          setPerf({ feedbackCount: 0, visits: purRes.data?.totalVisits || 0 });
          setLoading(false);
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
  }, []);

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
        { label: 'Staff Behaviour', value: perf.avgBehaviour, max: 5, color: '#7c3aed' },
        { label: 'Helpfulness', value: perf.avgHelpfulness, max: 5, color: '#06b6d4' },
        { label: 'Product Knowledge', value: perf.avgProductKnowledge, max: 5, color: '#ec4899' },
        { label: 'Customer Satisfaction', value: `${perf.satisfactionRate}%`, raw: perf.satisfactionRate, max: 100, color: '#10b981' },
        { label: 'Purchase Conversion', value: `${purchaseData?.conversionRate ?? 0}%`, raw: purchaseData?.conversionRate ?? 0, max: 100, color: '#8b5cf6' },
        { label: 'Avg. Overall Rating', value: perf.avgRating, max: 5, color: '#f59e0b' },
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
                      {purchaseData?.purchasedCount ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Purchased</div>
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
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">📊 Key Metrics Breakdown</span>
                </div>
                <div className="card-body">
                  {metrics.map((m) => (
                    <div key={m.label} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{m.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</span>
                      </div>
                      <ProgressBar value={parseFloat(m.raw ?? m.value)} max={m.max} color={m.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Non-Purchase Reasons & Lead Sources for Staff */}
            {purchaseData && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
                <div className="card fade-in">
                  <div className="card-header">
                    <span className="card-title">❌ Reasons Why My Visitors Didn't Buy</span>
                  </div>
                  <div className="card-body">
                    {(!purchaseData.reasonsBreakdown || purchaseData.reasonsBreakdown.length === 0) ? (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                        No non-purchased visitors recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {purchaseData.reasonsBreakdown.map((r) => (
                          <div key={r.reason} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{r.reason}</span>
                              <span style={{ fontWeight: 700, color: '#dc2626' }}>{r.count} ({r.percentage}%)</span>
                            </div>
                            <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                              <div style={{ width: `${r.percentage}%`, height: '100%', background: '#ef4444', borderRadius: 2 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
