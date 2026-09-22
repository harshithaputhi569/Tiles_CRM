import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdFileDownload, MdFilterList } from 'react-icons/md';

export default function Reports() {
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', staff: '', hasComplaint: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/staff').then(r => setStaff(r.data)).catch(() => {});
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.staff) params.set('staff', filters.staff);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.hasComplaint !== '') params.set('hasComplaint', filters.hasComplaint);

      const token = localStorage.getItem('tileshow_token');
      const response = await fetch(`/api/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TileShow_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully!');
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const reportFields = [
    'Customer Name', 'Mobile Number', 'Customer Type', 'Visit Date', 'Visit Purpose',
    'Staff Name', 'Behaviour Rating', 'Helpfulness Rating', 'Product Knowledge',
    'Tile Collection Rating', 'Pricing Explanation', 'Overall Experience',
    'Recommendation Score', 'Overall Rating', 'Complaint', 'Customer Comments', 'Suggestions'
  ];

  return (
    <>
      <Topbar title="Reports & Export" subtitle="Generate Excel reports for analysis" />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Filter Panel */}
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title"><MdFilterList /> Filter Options</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Staff Member</label>
                <select className="form-control" value={filters.staff} onChange={e => setFilters({ ...filters, staff: e.target.value })}>
                  <option value="">All Staff</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Complaint Filter</label>
                <select className="form-control" value={filters.hasComplaint} onChange={e => setFilters({ ...filters, hasComplaint: e.target.value })}>
                  <option value="">All Feedback</option>
                  <option value="false">No Complaints</option>
                  <option value="true">With Complaints</option>
                </select>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15, marginTop: 8 }}
                onClick={handleExport} disabled={loading}>
                <MdFileDownload style={{ fontSize: 20 }} />
                {loading ? 'Generating...' : 'Export to Excel (.xlsx)'}
              </button>

              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, fontSize: 12, color: '#34d399' }}>
                ✅ Report includes all filtered feedback records
              </div>
            </div>
          </div>

          {/* Preview Fields */}
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">📋 Report Columns Preview</span>
              <span className="badge badge-cyan">{reportFields.length} columns</span>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                {reportFields.map((field, i) => (
                  <div key={field} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: 13, color: 'var(--text-secondary)'
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
          {[
            { icon: '📊', title: 'Excel Format', desc: 'Professional .xlsx file with styled headers and formatted data' },
            { icon: '🎨', title: 'Styled Output', desc: 'Purple gradient headers, colour-coded ratings and complaint flags' },
            { icon: '📅', title: 'Date Filtered', desc: 'Filter by date range, staff member, or complaint status' },
          ].map(c => (
            <div key={c.title} className="card fade-in">
              <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
