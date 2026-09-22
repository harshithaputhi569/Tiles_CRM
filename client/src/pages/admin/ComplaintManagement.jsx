import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/UI';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['Pending', 'In Progress', 'Resolved'];

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const q = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/complaints${q}`);
      setComplaints(data);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(); }, [filter]);

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
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const counts = {
    all: complaints.length,
    Pending: complaints.filter(c => c.status === 'Pending').length,
    'In Progress': complaints.filter(c => c.status === 'In Progress').length,
    Resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  return (
    <>
      <Topbar title="Complaint Management" subtitle="Track and resolve customer complaints" />
      <div className="page-content">

        {/* Summary Bar */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total', val: counts.all, color: '#8b5cf6', bg: 'rgba(124,58,237,0.15)', icon: '📋' },
            { label: 'Pending', val: counts.Pending, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', icon: '⏳' },
            { label: 'In Progress', val: counts['In Progress'], color: '#22d3ee', bg: 'rgba(6,182,212,0.15)', icon: '🔄' },
            { label: 'Resolved', val: counts.Resolved, color: '#34d399', bg: 'rgba(16,185,129,0.15)', icon: '✅' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilter(s.label === 'Total' ? '' : s.label)}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color, fontSize: 22 }}>{s.icon}</div>
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card fade-in">
          <div className="card-header">
            <span className="card-title">🔴 Complaints List</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['', 'Pending', 'In Progress', 'Resolved'].map(s => (
                <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(s)}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          {loading ? <LoadingSpinner /> : complaints.length === 0 ? (
            <EmptyState icon="✅" message="No complaints found" sub="Great job! Showroom is performing well." />
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
                    <th>Reported</th>
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
                      <td>{c.staff?.name}</td>
                      <td>
                        <span className="badge badge-purple">{c.category}</span>
                      </td>
                      <td style={{ maxWidth: 220, whiteSpace: 'normal', fontSize: 13 }}>
                        {c.description.length > 60 ? c.description.slice(0, 60) + '…' : c.description}
                      </td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN')}
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
                    <button key={s} type="button"
                      className={`btn btn-sm ${newStatus === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setNewStatus(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Admin Remarks</label>
                <textarea className="form-control" rows={3} placeholder="Add your remarks about how this complaint was handled..."
                  value={remarks} onChange={e => setRemarks(e.target.value)} />
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
