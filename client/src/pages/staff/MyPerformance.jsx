import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, ProgressBar } from '../../components/UI';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function MyPerformance() {
  const { user } = useAuth();
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get own feedback to compute performance locally
    api.get('/feedback').then(r => {
      const feedbacks = r.data.feedbacks;
      const count = feedbacks.length;
      if (count === 0) { setPerf({ feedbackCount: 0, visits: 0 }); setLoading(false); return; }

      const avgR = (key) => feedbacks.reduce((s, f) => s + f.ratings[key], 0) / count;
      const avgRating = feedbacks.reduce((s, f) => s + f.overallRating, 0) / count;
      const satisfaction = feedbacks.filter(f => f.overallRating >= 4).length / count;
      const complaints = feedbacks.filter(f => f.hasComplaint).length;

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
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const radarData = perf ? [
    { subject: 'Behaviour', value: parseFloat(perf.avgBehaviour) * 20 },
    { subject: 'Helpfulness', value: parseFloat(perf.avgHelpfulness) * 20 },
    { subject: 'Product\nKnowledge', value: parseFloat(perf.avgProductKnowledge) * 20 },
    { subject: 'Satisfaction', value: parseFloat(perf.satisfactionRate) },
    { subject: 'Avg Rating', value: parseFloat(perf.avgRating) * 20 },
  ] : [];

  const metrics = perf ? [
    { label: 'Staff Behaviour', value: perf.avgBehaviour, max: 5, color: '#7c3aed' },
    { label: 'Helpfulness', value: perf.avgHelpfulness, max: 5, color: '#06b6d4' },
    { label: 'Product Knowledge', value: perf.avgProductKnowledge, max: 5, color: '#ec4899' },
    { label: 'Customer Satisfaction', value: `${perf.satisfactionRate}%`, raw: perf.satisfactionRate, max: 100, color: '#10b981' },
    { label: 'Avg. Overall Rating', value: perf.avgRating, max: 5, color: '#f59e0b' },
  ] : [];

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <Topbar title="My Performance" subtitle="Your personal performance metrics" />
      <div className="page-content">
        {loading ? <LoadingSpinner /> : !perf || perf.feedbackCount === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Performance Data Yet</div>
            <div style={{ color: 'var(--text-muted)' }}>Submit some customer feedback to see your performance metrics.</div>
          </div>
        ) : (
          <>
            {/* Score Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 24,
              padding: '24px 28px', marginBottom: 24,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 100%)',
              border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-xl)'
            }} className="fade-in">
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: `conic-gradient(${getScoreColor(perf.performanceScore)} ${perf.performanceScore}%, rgba(255,255,255,0.05) 0)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: `0 0 30px ${getScoreColor(perf.performanceScore)}40`
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: '#ffffff',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: getScoreColor(perf.performanceScore) }}>{perf.performanceScore}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5 }}>SCORE</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{user?.name}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>{user?.designation || 'Staff Member'}</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-cyan-light)' }}>{perf.feedbackCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Feedback</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>{perf.avgRating}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avg Rating</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>{perf.satisfactionRate}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Satisfied</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171' }}>{perf.complaints}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Complaints</div>
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
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#a0a0c0', fontSize: 11 }} />
                      <Radar name="Performance" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metric Bars */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">📊 Metric Breakdown</span>
                </div>
                <div className="card-body">
                  {metrics.map(m => (
                    <div key={m.label} style={{ marginBottom: 18 }}>
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

            {/* Score Breakdown */}
            <div className="card fade-in" style={{ marginTop: 20 }}>
              <div className="card-header">
                <span className="card-title">🏆 Performance Score Breakdown</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Customer Satisfaction', weight: '30%', color: '#10b981' },
                    { label: 'Staff Behaviour', weight: '25%', color: '#7c3aed' },
                    { label: 'Helpfulness', weight: '20%', color: '#06b6d4' },
                    { label: 'Product Knowledge', weight: '15%', color: '#ec4899' },
                    { label: 'Complaint Performance', weight: '10%', color: '#f59e0b' },
                  ].map(c => (
                    <div key={c.label} style={{
                      padding: '14px', borderRadius: 12,
                      background: `${c.color}10`, border: `1px solid ${c.color}25`,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: c.color, marginBottom: 4 }}>{c.weight}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
