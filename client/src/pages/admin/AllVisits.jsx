import { useState, useEffect, useCallback } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState } from '../../components/UI';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdSearch, MdRefresh, MdFilterList, MdWhatsapp, MdOpenInNew, MdContentCopy, MdTableChart, MdPictureAsPdf } from 'react-icons/md';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PURCHASE_COLORS = {
  Purchased:      { bg: 'rgba(16,185,129,0.12)',  color: '#059669',  border: 'rgba(16,185,129,0.3)' },
  'Not Purchased':{ bg: 'rgba(239,68,68,0.12)',   color: '#dc2626',  border: 'rgba(239,68,68,0.3)' },
  Interested:     { bg: 'rgba(245,158,11,0.12)',  color: '#b45309',  border: 'rgba(245,158,11,0.3)' },
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

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const getDaysAgoStr = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AllVisits() {
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [billingValueInput, setBillingValueInput] = useState('');
  const [savingBilling, setSavingBilling] = useState(false);
  const LIMIT = 20;

  const [filters, setFilters] = useState({
    search: '',
    staffId: '',
    purchaseStatus: '',
    startDate: getDaysAgoStr(30),
    endDate: getTodayStr(),
    preset: '30d',
  });

  // Load staff list for filter dropdown
  useEffect(() => {
    api.get('/staff').then(r => setStaff(r.data)).catch(() => {});
  }, []);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.search)        p.set('search', filters.search);
      if (filters.staffId)       p.set('staff', filters.staffId);
      if (filters.purchaseStatus) p.set('purchaseStatus', filters.purchaseStatus);
      if (filters.startDate)     p.set('startDate', filters.startDate);
      if (filters.endDate)       p.set('endDate', filters.endDate);
      p.set('all', 'true');  // admin override — show all staff
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

  const resetFilters = () => {
    setFilters({ search: '', staffId: '', purchaseStatus: '', startDate: getDaysAgoStr(30), endDate: getTodayStr(), preset: '30d' });
    setPage(1);
  };

  const copyLink = (link) => { navigator.clipboard.writeText(link); toast.success('Feedback link copied!'); };

  const openWhatsApp = (mobile, link, customerName) => {
    const phone = mobile?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Dear ${customerName}, thank you for visiting TileShow!\n\nPlease share your feedback:\n${link}\n\nWe value your opinion. 🙏`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  useEffect(() => {
    if (selected) {
      setBillingValueInput(selected.totalBillingValue ? String(selected.totalBillingValue) : '');
    }
  }, [selected]);

  const handleUpdateBilling = async () => {
    if (!selected) return;
    const num = Math.max(0, Number(billingValueInput) || 0);
    setSavingBilling(true);
    try {
      await api.put(`/visits/${selected._id}`, { totalBillingValue: num });
      toast.success('Total billing value updated!');
      const updated = { ...selected, totalBillingValue: num };
      setSelected(updated);
      setVisits((prev) => prev.map((v) => (v._id === selected._id ? { ...v, totalBillingValue: num } : v)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update billing value');
    } finally {
      setSavingBilling(false);
    }
  };

  /* CSV Export */
  const handleCsvExport = () => {
    if (visits.length === 0) return toast.error('No visits to export');
    const headers = ['#', 'Customer Name', 'Mobile', 'Visit Date', 'Visit #', 'Staff', 'Purpose', 'Source', 'Billing Value (₹)', 'Purchase Status', 'Reason', 'Repeat Reason', 'Feedback Submitted', 'Notes'];
    const rows = visits.map((v, i) => [
      i + 1,
      `"${(v.customer?.name || '').replace(/"/g, '""')}"`,
      `"${v.customer?.mobile || ''}"`,
      new Date(v.visitDate).toLocaleDateString('en-IN'),
      v.visitNumber || 1,
      `"${(v.staff?.name || '').replace(/"/g, '""')}"`,
      `"${v.purpose || ''}"`,
      `"${v.source || ''}"`,
      v.totalBillingValue || 0,
      `"${v.purchaseStatus || ''}"`,
      `"${(v.nonPurchaseReason || '').replace(/"/g, '""')}"`,
      `"${(v.repeatReason || '').replace(/"/g, '""')}"`,
      v.feedbackSubmitted ? 'Yes' : 'No',
      `"${(v.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Visits_${filters.startDate || 'all'}_to_${filters.endDate || 'now'}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
    toast.success('Visits CSV exported!');
  };

  /* PDF Export */
  const handlePdfExport = () => {
    if (visits.length === 0) return toast.error('No visits to export');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 55, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(17); doc.setFont('helvetica', 'bold');
      doc.text('TileShow CRM — All Customer Visits', 40, 34);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}   |   Total: ${total} records`, 40, 48);

      autoTable(doc, {
        startY: 65,
        head: [['#', 'Customer', 'Mobile', 'Date', 'Visit#', 'Staff', 'Purpose', 'Source', 'Billing (₹)', 'Status', 'Feedback']],
        body: visits.map((v, i) => [
          i + 1,
          v.customer?.name || '—',
          v.customer?.mobile || '—',
          new Date(v.visitDate).toLocaleDateString('en-IN'),
          v.visitNumber || 1,
          v.staff?.name || '—',
          v.purpose || '—',
          v.source || '—',
          v.totalBillingValue ? `₹${Number(v.totalBillingValue).toLocaleString('en-IN')}` : '—',
          v.purchaseStatus || '—',
          v.feedbackSubmitted ? 'Yes' : 'No',
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        margin: { left: 20, right: 20 },
      });

      doc.save(`TileShow_Visits_${filters.startDate || 'all'}_to_${filters.endDate || 'now'}.pdf`);
      toast.success('PDF exported!');
    } catch (err) { toast.error('PDF export failed'); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const purchased = visits.filter(v => v.purchaseStatus === 'Purchased').length;
  const notPurchased = visits.filter(v => v.purchaseStatus === 'Not Purchased').length;
  const interested = visits.filter(v => v.purchaseStatus === 'Interested').length;
  const feedbackPending = visits.filter(v => !v.feedbackSubmitted).length;
  const totalBilling = visits.reduce((sum, v) => sum + (v.totalBillingValue || 0), 0);

  return (
    <>
      <Topbar title="All Customer Visits" subtitle="Admin view — all staff visit records with filters and complaint tracking" />
      <div className="page-content">

        {/* Summary Cards */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Visits',    value: total,         icon: '👥', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
            { label: 'Total Billing',   value: `₹${totalBilling.toLocaleString('en-IN')}`, icon: '💰', color: '#047857', bg: 'rgba(16,185,129,0.15)' },
            { label: 'Purchased',       value: purchased,     icon: '✅', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
            { label: 'Not Purchased',   value: notPurchased,  icon: '❌', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
            { label: 'Feedback Pending',value: feedbackPending, icon: '💬', color: '#0891b2', bg: 'rgba(6,182,212,0.12)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="card fade-in" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdFilterList style={{ color: 'var(--accent-purple)', fontSize: 18 }} />
              <strong style={{ fontSize: 14 }}>Filter Visits</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-outline" onClick={handleCsvExport} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <MdTableChart /> CSV
              </button>
              <button className="btn btn-sm btn-outline" onClick={handlePdfExport}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, borderColor: 'rgba(124,58,237,0.4)', color: '#7c3aed' }}>
                <MdPictureAsPdf /> PDF
              </button>
              <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ fontSize: 12 }}>Reset</button>
            </div>
          </div>

          {/* Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Quick:</span>
            {[{ id: 'today', label: 'Today' }, { id: '7d', label: '7 Days' }, { id: '30d', label: '30 Days' }, { id: 'all', label: 'All Time' }].map(p => (
              <button key={p.id} type="button"
                className={`btn btn-xs ${filters.preset === p.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
                onClick={() => applyPreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
              <div style={{ position: 'relative' }}>
                <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                <input className="form-control" style={{ paddingLeft: 34, fontSize: 13 }}
                  placeholder="Search customer name or phone…"
                  value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Staff Member</label>
              <select className="form-control" style={{ fontSize: 13 }} value={filters.staffId} onChange={e => handleFilterChange('staffId', e.target.value)}>
                <option value="">All Staff</option>
                {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Purchase Status</label>
              <select className="form-control" style={{ fontSize: 13 }} value={filters.purchaseStatus} onChange={e => handleFilterChange('purchaseStatus', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Purchased">Purchased</option>
                <option value="Not Purchased">Not Purchased</option>
                <option value="Interested">Interested</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>From Date</label>
              <input type="date" className="form-control" style={{ fontSize: 13 }} value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>To Date</label>
              <input type="date" className="form-control" style={{ fontSize: 13 }} value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
            </div>
          </div>

          {(filters.search || filters.staffId || filters.purchaseStatus || filters.startDate || filters.endDate) && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              🔍 Showing <strong>{total}</strong> visit{total !== 1 ? 's' : ''} matching active filters
            </div>
          )}
        </div>

        {/* Visits Table */}
        <div className="card fade-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span className="card-title">🗂️ Visit Records ({total})</span>
            <button className="btn btn-ghost btn-sm" onClick={fetchVisits} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <MdRefresh /> Refresh
            </button>
          </div>

          {loading ? <LoadingSpinner /> : visits.length === 0 ? (
            <EmptyState icon="📭" message="No visits found" sub="Try adjusting your filters or date range" />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Staff</th>
                    <th>Visit Date</th>
                    <th>Purpose</th>
                    <th>Source</th>
                    <th>Billing Value</th>
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
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{v.staff?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.staff?.designation}</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(v.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{v.purpose}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.source}</td>
                      <td>
                        {v.totalBillingValue > 0 ? (
                          <span style={{ fontWeight: 800, color: '#047857', fontSize: 13 }}>
                            ₹{Number(v.totalBillingValue).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages} · {total} records</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">📋 Visit Detail — Admin View</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Customer */}
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(6,182,212,0.04) 100%)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Customer</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.customer?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📱 {selected.customer?.mobile}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.customer?.customerType}</div>
                </div>

                {/* Staff */}
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Staff Member</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.staff?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.staff?.designation}</div>
                </div>
              </div>

              {/* Instant Total Billing Value Input */}
              <div style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.05) 100%)',
                border: '1.5px solid rgba(16,185,129,0.3)',
                borderRadius: 10,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <label style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#047857',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    margin: 0,
                  }}>
                    <span>💰</span> Total Billing Value (₹) — Enter Instantly:
                  </label>
                  {selected.totalBillingValue > 0 && (
                    <span style={{
                      background: 'rgba(16,185,129,0.2)',
                      color: '#065f46',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 12,
                    }}>
                      Current: ₹{Number(selected.totalBillingValue).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: 700,
                      color: '#059669',
                      fontSize: 14,
                    }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="Enter total bill/invoice amount"
                      value={billingValueInput}
                      onChange={(e) => setBillingValueInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateBilling(); }}
                      style={{
                        paddingLeft: 26,
                        fontWeight: 700,
                        fontSize: 14,
                        background: '#ffffff',
                        borderColor: 'rgba(16,185,129,0.5)',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={savingBilling}
                    onClick={handleUpdateBilling}
                    style={{ whiteSpace: 'nowrap', minWidth: 85 }}
                  >
                    {savingBilling ? 'Saving…' : '💾 Save'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Enter the invoice or bill amount and click Save to record instantly.
                </div>
              </div>

              {/* Visit Details */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                {[
                  { label: 'Visit Date', value: new Date(selected.visitDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                  { label: 'Registered At', value: new Date(selected.createdAt).toLocaleTimeString('en-IN') },
                  { label: 'Visit Number', value: `#${selected.visitNumber || 1}${selected.isRepeatVisit ? ' (Repeat)' : ' (First)'}` },
                  { label: 'Purpose', value: selected.purpose },
                  { label: 'Lead Source', value: selected.source },
                  { label: 'Purchase Status', value: <StatusChip status={selected.purchaseStatus} /> },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {selected.nonPurchaseReason && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>Not Purchased Reason: </span>{selected.nonPurchaseReason}
                </div>
              )}
              {selected.repeatReason && (
                <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: '#b45309', fontWeight: 700 }}>Repeat Visit Reason: </span>{selected.repeatReason}
                </div>
              )}
              {selected.notes && (
                <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase' }}>Notes</div>
                  {selected.notes}
                </div>
              )}

              {/* Feedback Link Section (Admin) */}
              <div style={{ padding: '14px 16px', background: selected.feedbackSubmitted ? 'rgba(16,185,129,0.06)' : 'rgba(124,58,237,0.06)', border: `1px solid ${selected.feedbackSubmitted ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.2)'}`, borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: selected.feedbackSubmitted ? '#059669' : '#7c3aed' }}>
                  {selected.feedbackSubmitted ? '✅ Customer Feedback Submitted' : '📱 Share Feedback & Complaint Link'}
                </div>
                {!selected.feedbackSubmitted && (
                  (() => {
                    const token = selected.feedbackToken || selected._id;
                    const link = `${window.location.origin}/feedback/${token}`;
                    return (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #25d366, #128c7e)', fontSize: 12 }}
                          onClick={() => openWhatsApp(selected.customer?.mobile, link, selected.customer?.name)}
                        >
                          <MdWhatsapp style={{ fontSize: 15 }} /> Send via WhatsApp
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                          onClick={() => copyLink(link)}
                        >
                          <MdContentCopy style={{ fontSize: 13 }} /> Copy Link
                        </button>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 12 }}
                        >
                          <MdOpenInNew style={{ fontSize: 14 }} /> Preview Form
                        </a>
                      </div>
                    );
                  })()
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
