import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, RatingBadge, Stars, Badge } from '../../components/UI';
import api from '../../api/axios';

export default function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ staff: '', hasComplaint: '', startDate: '', endDate: '' });

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filters.staff) p.set('staff', filters.staff);
    if (filters.hasComplaint !== '') p.set('hasComplaint', filters.hasComplaint);
    if (filters.startDate) p.set('startDate', filters.startDate);
    if (filters.endDate) p.set('endDate', filters.endDate);
    return p.toString();
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/feedback?${buildQuery()}`);
      setFeedbacks(data.feedbacks);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/staff').then(r => setStaff(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchFeedbacks(); }, [filters]);

  const RatingRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-glass)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Stars rating={value} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{value}/5</span>
      </div>
    </div>
  );

  return (
    <>
      <Topbar title="Feedback Management" subtitle="View and filter all customer feedback" />
      <div className="page-content">
        <div className="card fade-in">
          <div className="filter-bar">
            <select className="form-control" value={filters.staff} onChange={e => setFilters({ ...filters, staff: e.target.value })}>
              <option value="">All Staff</option>
              {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select className="form-control" value={filters.hasComplaint} onChange={e => setFilters({ ...filters, hasComplaint: e.target.value })}>
              <option value="">All Feedback</option>
              <option value="false">No Complaint</option>
              <option value="true">With Complaint</option>
            </select>
            <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
            <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ staff: '', hasComplaint: '', startDate: '', endDate: '' })}>
              Clear
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              {feedbacks.length} records
            </span>
          </div>

          {loading ? <LoadingSpinner /> : feedbacks.length === 0 ? (
            <EmptyState icon="💬" message="No feedback found" sub="Try adjusting your filters" />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Staff</th>
                    <th>Visit Purpose</th>
                    <th>Overall Rating</th>
                    <th>Recommendation</th>
                    <th>Complaint</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map(f => (
                    <tr key={f._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.customer?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.customer?.customerType}</div>
                      </td>
                      <td>{f.staff?.name}</td>
                      <td>{f.visit?.purpose || '—'}</td>
                      <td><RatingBadge rating={f.overallRating} /></td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: f.recommendationScore >= 7 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: f.recommendationScore >= 7 ? '#34d399' : '#f87171',
                        }}>
                          {f.recommendationScore}/10
                        </span>
                      </td>
                      <td>
                        {f.hasComplaint
                          ? <Badge type="red">⚠ Complaint</Badge>
                          : <Badge type="green">✓ Clear</Badge>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(f.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => setSelected(f)}>Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">📋 Feedback Details</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CUSTOMER</div>
                  <div style={{ fontWeight: 700 }}>{selected.customer?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.customer?.mobile} · {selected.customer?.customerType}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>STAFF MEMBER</div>
                  <div style={{ fontWeight: 700 }}>{selected.staff?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.staff?.designation}</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Ratings Breakdown</div>
                <RatingRow label="Staff Behaviour" value={selected.ratings.behaviour} />
                <RatingRow label="Helpfulness" value={selected.ratings.helpfulness} />
                <RatingRow label="Product Knowledge" value={selected.ratings.productKnowledge} />
                <RatingRow label="Tile Collection" value={selected.ratings.tileCollection} />
                <RatingRow label="Pricing Explanation" value={selected.ratings.pricingExplanation} />
                <RatingRow label="Overall Experience" value={selected.ratings.overallExperience} />
              </div>

              <div className="form-grid-2" style={{ marginBottom: 12 }}>
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recommendation Score</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: selected.recommendationScore >= 7 ? '#34d399' : '#f87171' }}>
                    {selected.recommendationScore}/10
                  </div>
                </div>
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Overall Rating</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-cyan-light)' }}>
                    {selected.overallRating}/5
                  </div>
                </div>
              </div>

              {selected.comments && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>CUSTOMER COMMENTS</div>
                  <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{selected.comments}"
                  </div>
                </div>
              )}

              {selected.suggestions && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>SUGGESTIONS</div>
                  <div style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                    {selected.suggestions}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
