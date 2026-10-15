import { useState, useEffect, useCallback } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/UI';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdSearch, MdRefresh, MdWhatsapp, MdOpenInNew, MdContentCopy, MdFilterList } from 'react-icons/md';

const PURCHASE_COLORS = {
  Purchased: { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.3)' },
  'Not Purchased': { bg: 'rgba(239,68,68,0.12)', color: '#dc2626', border: 'rgba(239,68,68,0.3)' },
  Interested: { bg: 'rgba(245,158,11,0.12)', color: '#b45309', border: 'rgba(245,158,11,0.3)' },
};

const StatusChip = ({ status }) => {
  const s = PURCHASE_COLORS[status] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status === 'Purchased' ? '✓' : status === 'Not Purchased' ? '✗' : '◎'} {status}
    </span>
  );
};

const ComplaintStatusChip = ({ status }) => {
  if (!status) return <span style={{ fontSize: 11, color: '#94a3b8' }}>None</span>;
  const map = {
    Pending:     { bg: 'rgba(245,158,11,0.12)', color: '#b45309', icon: '⏳' },
    'In Progress': { bg: 'rgba(6,182,212,0.12)', color: '#0891b2', icon: '🔄' },
    Resolved:    { bg: 'rgba(16,185,129,0.12)', color: '#059669', icon: '✅' },
  };
  const m = map[status] || { bg: '#f1f5f9', color: '#64748b', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: m.bg, color: m.color,
    }}>
      {m.icon} {status}
    </span>
  );
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getDaysAgoStr = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function MyVisits() {
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const LIMIT = 15;

  const [filters, setFilters] = useState({
    search: '',
    purchaseStatus: '',
    startDate: getDaysAgoStr(30),
    endDate: getTodayStr(),
    preset: '30d',
  });

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.search) p.set('search', filters.search);
      if (filters.purchaseStatus) p.set('purchaseStatus', filters.purchaseStatus);
      if (filters.startDate) p.set('startDate', filters.startDate);
      if (filters.endDate) p.set('endDate', filters.endDate);
      p.set('page', page);
      p.set('limit', LIMIT);

      const { data } = await api.get(`/visits?${p.toString()}`);
      setVisits(data.visits || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  const applyPreset = (preset) => {
    if (preset === 'today') setFilters(f => ({ ...f, startDate: getTodayStr(), endDate: getTodayStr(), preset }));
    else if (preset === '7d') setFilters(f => ({ ...f, startDate: getDaysAgoStr(7), endDate: getTodayStr(), preset }));
    else if (preset === '30d') setFilters(f => ({ ...f, startDate: getDaysAgoStr(30), endDate: getTodayStr(), preset }));
    else if (preset === 'all') setFilters(f => ({ ...f, startDate: '', endDate: '', preset }));
    setPage(1);
  };

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val, preset: '' }));
    setPage(1);
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('Feedback link copied!');
  };

  const openWhatsApp = (mobile, link, customerName) => {
    const phone = mobile.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Dear ${customerName}, thank you for visiting TileShow!\n\nWe value your feedback. Please take a moment to share your experience:\n${link}\n\nYour response helps us serve you better. 🙏`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Topbar title="My Customer Visits" subtitle="View your registered visits, send feedback links, and track complaint status" />
      <div className="page-content">

        {/* Summary Stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Visits', value: total, icon: '👥', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
            { label: 'Purchased', value: visits.filter(v => v.purchaseStatus === 'Purchased').length, icon: '✅', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
            { label: 'Not Purchased', value: visits.filter(v => v.purchaseStatus === 'Not Purchased').length, icon: '❌', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
            { label: 'Feedback Sent', value: visits.filter(v => v.feedbackSubmitted).length, icon: '💬', color: '#0891b2', bg: 'rgba(6,182,212,0.12)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card fade-in" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Date Range:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-xs ${filters.preset === p.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {/* Search */}
            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <div style={{ position: 'relative' }}>
                <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                <input
                  className="form-control"
                  style={{ paddingLeft: 34, fontSize: 13 }}
                  placeholder="Search by customer name or phone…"
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>From Date</label>
              <input type="date" className="form-control" style={{ fontSize: 13 }}
                value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>To Date</label>
              <input type="date" className="form-control" style={{ fontSize: 13 }}
                value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Purchase Status</label>
              <select className="form-control" style={{ fontSize: 13 }}
                value={filters.purchaseStatus} onChange={e => handleFilterChange('purchaseStatus', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Purchased">Purchased</option>
                <option value="Not Purchased">Not Purchased</option>
                <option value="Interested">Interested</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => { setFilters({ search: '', purchaseStatus: '', startDate: getDaysAgoStr(30), endDate: getTodayStr(), preset: '30d' }); setPage(1); }}>
                <MdRefresh /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card fade-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span className="card-title">📋 Visit Records ({total})</span>
            <button className="btn btn-ghost btn-sm" onClick={fetchVisits} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <MdRefresh /> Refresh
            </button>
          </div>

          {loading ? <LoadingSpinner /> : visits.length === 0 ? (
            <EmptyState icon="📭" message="No visits found" sub="Register a customer visit to see records here" />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Visit Date & Time</th>
                    <th>Purpose</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Feedback</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v, i) => (
                    <tr key={v._id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{(page - 1) * LIMIT + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{v.customer?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📱 {v.customer?.mobile}</div>
                        {v.isRepeatVisit && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309', background: 'rgba(245,158,11,0.12)', padding: '1px 6px', borderRadius: 8 }}>
                            🔁 Visit #{v.visitNumber}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(v.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{v.purpose}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.source}</td>
                      <td><StatusChip status={v.purchaseStatus} /></td>
                      <td>
                        {v.feedbackSubmitted
                          ? <span className="badge badge-green">✓ Submitted</span>
                          : <span className="badge badge-purple">⏳ Pending</span>}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => setSelected(v)}>Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--border-glass)' }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">📋 Visit Details</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Customer Info */}
              <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(6,182,212,0.04) 100%)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.customer?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📱 {selected.customer?.mobile} · {selected.customer?.customerType}</div>
                {selected.isRepeatVisit && (
                  <div style={{ fontSize: 12, color: '#b45309', marginTop: 4, fontWeight: 600 }}>🔁 Repeat Visitor · Visit #{selected.visitNumber}</div>
                )}
              </div>

              {/* Visit Details Grid */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                {[
                  { label: 'Visit Date', value: new Date(selected.visitDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: 'Registered At', value: new Date(selected.createdAt).toLocaleTimeString('en-IN') },
                  { label: 'Visit Purpose', value: selected.purpose },
                  { label: 'Lead Source', value: selected.source },
                  { label: 'Purchase Status', value: <StatusChip status={selected.purchaseStatus} /> },
                  { label: 'Staff', value: selected.staff?.name },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Reason for not purchasing */}
              {selected.purchaseStatus === 'Not Purchased' && selected.nonPurchaseReason && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>Reason Not Purchased: </span>
                  {selected.nonPurchaseReason}
                </div>
              )}

              {/* Repeat reason */}
              {selected.repeatReason && (
                <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                  <span style={{ color: '#b45309', fontWeight: 700 }}>Repeat Visit Reason: </span>
                  {selected.repeatReason}
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase' }}>Notes</div>
                  {selected.notes}
                </div>
              )}

              {/* Feedback Link Section */}
              <div style={{ padding: '14px 16px', background: selected.feedbackSubmitted ? 'rgba(16,185,129,0.06)' : 'rgba(124,58,237,0.06)', border: `1px solid ${selected.feedbackSubmitted ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)'}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: selected.feedbackSubmitted ? '#059669' : '#7c3aed' }}>
                  {selected.feedbackSubmitted ? '✅ Feedback Already Submitted' : '📱 Share Feedback & Complaint Link'}
                </div>
                {!selected.feedbackSubmitted && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Send the customer a unique link via WhatsApp or copy it. The customer can rate their experience and raise a complaint.
                    </div>
                    {(() => {
                      const token = selected.feedbackToken || selected._id;
                      const link = `${window.location.origin}/feedback/${token}`;
                      return (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #25d366, #128c7e)', fontSize: 13 }}
                            onClick={() => openWhatsApp(
                              selected.customer?.mobile,
                              link,
                              selected.customer?.name
                            )}
                          >
                            <MdWhatsapp style={{ fontSize: 16 }} /> Send via WhatsApp
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                            onClick={() => copyLink(link)}
                          >
                            <MdContentCopy style={{ fontSize: 14 }} /> Copy Link
                          </button>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13 }}
                          >
                            <MdOpenInNew style={{ fontSize: 14 }} /> Preview Form
                          </a>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
