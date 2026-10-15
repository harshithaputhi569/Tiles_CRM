import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/UI';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  MdFilterList, MdFileDownload, MdCalendarToday, MdClear,
  MdPictureAsPdf, MdTableChart, MdRefresh
} from 'react-icons/md';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_FLOW = ['Pending', 'In Progress', 'Resolved'];
const COMPLAINT_CATS = [
  'Staff Behaviour',
  'Waiting Time',
  'Product Availability',
  'Pricing',
  'Billing',
  'Product Information',
  'Delivery',
  'Other',
];

const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Filters including date options
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    startDate: '',
    endDate: '',
    preset: 'all',
  });

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.status) p.set('status', filters.status);
      if (filters.category) p.set('category', filters.category);
      if (filters.startDate) p.set('startDate', filters.startDate);
      if (filters.endDate) p.set('endDate', filters.endDate);

      const qs = p.toString() ? `?${p.toString()}` : '';
      const { data } = await api.get(`/complaints${qs}`);
      setComplaints(data);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filters.status, filters.category, filters.startDate, filters.endDate]);

  const applyPreset = (preset) => {
    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (preset === 'today') {
      setFilters(f => ({ ...f, startDate: todayStr, endDate: todayStr, preset: 'today' }));
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatLocalDate(y);
      setFilters(f => ({ ...f, startDate: yStr, endDate: yStr, preset: 'yesterday' }));
    } else if (preset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      setFilters(f => ({ ...f, startDate: formatLocalDate(d7), endDate: todayStr, preset: '7days' }));
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilters(f => ({ ...f, startDate: formatLocalDate(first), endDate: todayStr, preset: 'month' }));
    } else if (preset === 'all') {
      setFilters(f => ({ ...f, startDate: '', endDate: '', preset: 'all' }));
    }
  };

  const clearAllFilters = () => {
    setFilters({
      status: '',
      category: '',
      startDate: '',
      endDate: '',
      preset: 'all',
    });
  };

  const openModal = (c) => {
    setSelected(c);
    setRemarks(c.adminRemarks || '');
    setNewStatus(c.status);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/complaints/${selected._id}`, { status: newStatus, adminRemarks: remarks });
      toast.success('Complaint updated');
      setSelected(null);
      fetchComplaints();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Export Complaints to CSV ── */
  const handleCsvExport = () => {
    if (complaints.length === 0) return toast.error('No complaints to export');
    const headers = ['#', 'Date Reported', 'Customer Name', 'Customer Mobile', 'Assigned Staff', 'Category', 'Description', 'Status', 'Resolved Date', 'Admin Remarks'];
    const rows = complaints.map((c, i) => [
      i + 1,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
      `"${(c.customer?.name || '').replace(/"/g, '""')}"`,
      `"${c.customer?.mobile || ''}"`,
      `"${(c.staff?.name || '').replace(/"/g, '""')}"`,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      `"${c.status || ''}"`,
      c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString('en-IN') : '',
      `"${(c.adminRemarks || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `Complaints_Report_${filters.startDate || 'all'}_to_${filters.endDate || 'now'}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Complaints CSV report downloaded!');
  };

  /* ── Export Complaints to PDF ── */
  const handlePdfExport = () => {
    if (complaints.length === 0) return toast.error('No complaints to export');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      // Cover Header
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 55, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('TileShow CRM — Complaints Report', 40, 34);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const dateStr = `Generated: ${new Date().toLocaleString('en-IN')}`;
      const filterStr = [
        filters.startDate ? `From: ${filters.startDate}` : '',
        filters.endDate ? `To: ${filters.endDate}` : '',
        filters.status ? `Status: ${filters.status}` : '',
        filters.category ? `Category: ${filters.category}` : '',
      ].filter(Boolean).join('   |   ');
      doc.text(`${dateStr}${filterStr ? '   |   ' + filterStr : ''}`, 40, 48);

      const columns = ['#', 'Date', 'Customer', 'Mobile', 'Staff', 'Category', 'Description', 'Status', 'Resolved At', 'Remarks'];
      const rows = complaints.map((c, i) => [
        i + 1,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—',
        c.customer?.name || '—',
        c.customer?.mobile || '—',
        c.staff?.name || '—',
        c.category || '—',
        c.description || '—',
        c.status || 'Pending',
        c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString('en-IN') : '—',
        c.adminRemarks || '—',
      ]);

      autoTable(doc, {
        startY: 65,
        head: [columns],
        body: rows,
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        margin: { left: 20, right: 20 },
      });

      doc.save(`TileShow_Complaints_Report_${filters.startDate || 'all'}_to_${filters.endDate || 'now'}.pdf`);
      toast.success('Complaints PDF report downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    }
  };

  const counts = {
    all: complaints.length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    'In Progress': complaints.filter(c => c.status === 'In Progress').length,
    Resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  const hasActiveFilters = Boolean(
    filters.startDate || filters.endDate || filters.status || filters.category
  );

  return (
    <>
      <Topbar
        title="Complaints Report & Management"
        subtitle="Track, filter by date, and resolve customer complaints"
      />
      <div className="page-content">

        {/* Summary Stat Cards */}
        <div className="stats-grid complaint-summary-grid" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total', val: counts.all, color: '#8b5cf6', bg: 'rgba(124,58,237,0.15)', icon: '📋', statusVal: '' },
            { label: 'Pending', val: counts.Pending, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', icon: '⏳', statusVal: 'Pending' },
            { label: 'In Progress', val: counts['In Progress'], color: '#22d3ee', bg: 'rgba(6,182,212,0.15)', icon: '🔄', statusVal: 'In Progress' },
            { label: 'Resolved', val: counts.Resolved, color: '#34d399', bg: 'rgba(16,185,129,0.15)', icon: '✅', statusVal: 'Resolved' },
          ].map(s => (
            <div
              key={s.label}
              className="stat-card"
              style={{
                cursor: 'pointer',
                border: filters.status === s.statusVal && s.statusVal !== '' ? `2px solid ${s.color}` : undefined,
                boxShadow: filters.status === s.statusVal && s.statusVal !== '' ? `0 0 10px ${s.bg}` : undefined,
              }}
              onClick={() => setFilters(f => ({ ...f, status: f.status === s.statusVal ? '' : s.statusVal }))}
              title={`Click to filter by ${s.label}`}
            >
              <div className="stat-icon" style={{ background: s.bg, color: s.color, fontSize: 22 }}>{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">
                {s.label} {filters.startDate || filters.endDate ? '(in date range)' : ''}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter By Date & Report Controls Card ── */}
        <div className="card fade-in" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div>
                <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>Filter Complaints by Date</strong>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  View complaints registered within a custom date period or preset range
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={handleCsvExport}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                title="Export filtered complaints report to CSV"
              >
                <MdTableChart /> Export CSV
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={handlePdfExport}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                  borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444'
                }}
                title="Export filtered complaints report to PDF"
              >
                <MdPictureAsPdf /> Export PDF
              </button>
              {hasActiveFilters && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={clearAllFilters}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}
                >
                  <MdClear /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Quick Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
              Quick Presets:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-xs ${filters.preset === p.id && (!filters.startDate || p.id !== 'all') ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 12 }}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs & Category Select */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            alignItems: 'flex-end',
            background: 'rgba(255,255,255,0.03)',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--border-glass)'
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MdCalendarToday style={{ fontSize: 12 }} /> Start Date (From)
              </label>
              <input
                type="date"
                className="form-control"
                style={{ fontSize: 13, padding: '6px 10px' }}
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value, preset: '' }))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MdCalendarToday style={{ fontSize: 12 }} /> End Date (To)
              </label>
              <input
                type="date"
                className="form-control"
                style={{ fontSize: 13, padding: '6px 10px' }}
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value, preset: '' }))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                Category
              </label>
              <select
                className="form-control"
                style={{ fontSize: 13, padding: '6px 10px' }}
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {COMPLAINT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                Status
              </label>
              <select
                className="form-control"
                style={{ fontSize: 13, padding: '6px 10px' }}
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <option value="">All Statuses</option>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 12, padding: '8px 12px',
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 8, fontSize: 12
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                🔍 Filter active: {filters.startDate ? `From ${filters.startDate}` : ''} {filters.endDate ? `To ${filters.endDate}` : ''}
                {filters.category ? ` • Category: ${filters.category}` : ''}
                {filters.status ? ` • Status: ${filters.status}` : ''}
                {' '}(<strong>{complaints.length}</strong> complaint{complaints.length !== 1 ? 's' : ''} found)
              </span>
              <button
                className="btn btn-link btn-xs"
                onClick={clearAllFilters}
                style={{ fontSize: 12, color: 'var(--primary)', padding: 0, textDecoration: 'underline' }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Complaints Table Card */}
        <div className="card fade-in">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span className="card-title">🔴 Complaints List ({complaints.length})</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['', 'Pending', 'In Progress', 'Resolved'].map(s => (
                <button
                  key={s}
                  className={`btn btn-sm ${filters.status === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilters(f => ({ ...f, status: s }))}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : complaints.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>
                {hasActiveFilters ? '🔍' : '✅'}
              </div>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                {hasActiveFilters ? 'No Complaints Found For Selected Filters' : 'No Complaints Found'}
              </h4>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                {hasActiveFilters
                  ? 'Try selecting a different date range or clearing the category/status filter.'
                  : 'Great job! Showroom is performing well with zero complaints.'}
              </p>
              {hasActiveFilters && (
                <button className="btn btn-outline btn-sm" onClick={clearAllFilters}>
                  Clear Date & Filters
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Staff</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Reported Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c, i) => (
                    <tr key={c._id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.customer?.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.customer?.mobile}</div>
                      </td>
                      <td>{c.staff?.name || '—'}</td>
                      <td>
                        <span className="badge badge-purple">{c.category}</span>
                      </td>
                      <td style={{ maxWidth: 240, whiteSpace: 'normal', fontSize: 13 }}>
                        {c.description.length > 70 ? c.description.slice(0, 70) + '…' : c.description}
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => openModal(c)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Manage Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">⚠️ Manage Complaint</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, marginBottom: 4 }}>COMPLAINT DESCRIPTION</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{selected.description}</div>
              </div>

              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CUSTOMER</div>
                  <div style={{ fontWeight: 600 }}>{selected.customer?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.customer?.mobile}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>STAFF</div>
                  <div style={{ fontWeight: 600 }}>{selected.staff?.name}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Update Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {STATUS_FLOW.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn-sm ${newStatus === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setNewStatus(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Remarks</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Add your remarks about how this complaint was handled..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>

              {selected.resolvedAt && (
                <div style={{ fontSize: 12, color: 'var(--status-success)' }}>
                  ✅ Resolved on {new Date(selected.resolvedAt).toLocaleDateString('en-IN')}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleUpdate}>
                {saving ? 'Updating...' : 'Update Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
