import { useState, useEffect, useMemo } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/UI';
import { MdAdd, MdEdit, MdDelete, MdPersonOff, MdCheckCircle, MdSearch, MdPeople } from 'react-icons/md';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const emptyForm = { name: '', email: '', password: '', phone: '', designation: '' };

const DESIGNATIONS = [
  'Sales Executive', 'Senior Sales Executive',
  'Customer Relationship Executive', 'Showroom Manager',
  'Support Executive', 'Floor Manager', 'Assistant Manager',
];

const PAGE_SIZE = 25;

/* ── Shared cell style ── */
const cell = (extra = {}) => ({
  padding: '0 14px',
  height: 54,
  textAlign: 'center',
  verticalAlign: 'middle',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid rgba(124,58,237,0.07)',
  whiteSpace: 'nowrap',
  ...extra,
});

/* ── Shared header style ── */
const th = {
  padding: '13px 14px',
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: '#7c3aed',
  textTransform: 'uppercase',
  letterSpacing: '0.9px',
  background: 'linear-gradient(180deg,#f4f0ff 0%,#f8f7ff 100%)',
  borderBottom: '2px solid rgba(124,58,237,0.18)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  whiteSpace: 'nowrap',
};

export default function StaffManagement() {
  const [staff, setStaff]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/staff');
      setStaff(data);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openAdd = () => {
    setForm(emptyForm); setEditMode(false); setSelectedId(null); setShowModal(true);
  };
  const openEdit = (s) => {
    setForm({ name: s.name, email: s.email, password: '', phone: s.phone || '', designation: s.designation || '' });
    setEditMode(true); setSelectedId(s._id); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and email are required');
    if (!editMode && !form.password) return toast.error('Password is required');
    setSaving(true);
    try {
      if (editMode) {
        await api.put(`/staff/${selectedId}`, form);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/staff', form);
        toast.success('Staff member added');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving staff'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    try {
      await api.put(`/staff/${s._id}`, { isActive: !s.isActive });
      toast.success(`Staff ${s.isActive ? 'deactivated' : 'activated'}`);
      fetchStaff();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff removed');
      fetchStaff();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return staff.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' ? true : statusFilter === 'active' ? s.isActive : !s.isActive;
      return matchSearch && matchStatus;
    });
  }, [staff, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const activeCount   = staff.filter(s => s.isActive).length;
  const inactiveCount = staff.length - activeCount;

  /* Avatar gradient from initials */
  const avatarGradients = [
    'linear-gradient(135deg,#7c3aed,#06b6d4)',
    'linear-gradient(135deg,#059669,#34d399)',
    'linear-gradient(135deg,#dc2626,#f97316)',
    'linear-gradient(135deg,#2563eb,#7c3aed)',
    'linear-gradient(135deg,#d97706,#f59e0b)',
  ];
  const avatarGrad = (name) => avatarGradients[name.charCodeAt(0) % avatarGradients.length];

  return (
    <>
      <Topbar title="Staff Management" subtitle="Add, edit, and manage staff members" />

      <div style={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px',
        gap: 14,
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}>

        {/* ── Stats strip ── */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          {[
            { label: 'Total Staff', value: staff.length,  color: '#7c3aed', bg: 'rgba(124,58,237,0.09)', border: 'rgba(124,58,237,0.2)' },
            { label: 'Active',      value: activeCount,   color: '#059669', bg: 'rgba(5,150,105,0.09)',  border: 'rgba(5,150,105,0.2)'  },
            { label: 'Inactive',    value: inactiveCount, color: '#dc2626', bg: 'rgba(220,38,38,0.09)',  border: 'rgba(220,38,38,0.2)'  },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1, background: '#fff',
              border: `1px solid ${s.border}`,
              borderRadius: 14, padding: '14px 22px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 2px 12px rgba(100,80,200,0.07)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MdPeople style={{ color: s.color, fontSize: 22 }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                  {s.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main card ── */}
        <div style={{
          flex: 1, background: '#fff',
          border: '1px solid var(--border-glass)',
          borderRadius: 16,
          boxShadow: '0 2px 16px rgba(100,80,200,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minHeight: 0,
        }}>

          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 20px',
            borderBottom: '1px solid var(--border-glass)',
            background: 'rgba(124,58,237,0.025)',
            flexShrink: 0, gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              👥 All Staff Members
              <span style={{
                padding: '2px 10px', borderRadius: 20,
                background: 'rgba(124,58,237,0.1)', color: '#6d28d9',
                fontSize: 12, fontWeight: 700, border: '1px solid rgba(124,58,237,0.2)',
              }}>{filtered.length.toLocaleString()}</span>
            </span>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <MdSearch style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: 17, pointerEvents: 'none',
                }} />
                <input className="form-control"
                  style={{ paddingLeft: 32, width: 210, height: 36, fontSize: 13 }}
                  placeholder="Search staff..."
                  value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>

              <select className="form-control"
                style={{ height: 36, fontSize: 13, width: 130 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button className="btn btn-primary"
                style={{ height: 36, padding: '0 18px', fontSize: 13 }}
                onClick={openAdd}>
                <MdAdd /> Add Staff
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
            {loading ? (
              <LoadingSpinner />
            ) : paginated.length === 0 ? (
              <EmptyState icon="👥" message="No staff found" />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 48 }}>#</th>
                    <th style={{ ...th, width: '18%', textAlign: 'left', paddingLeft: 16 }}>Name</th>
                    <th style={{ ...th, width: '20%' }}>Email</th>
                    <th style={{ ...th, width: '11%' }}>Phone</th>
                    <th style={{ ...th, width: '18%' }}>Designation</th>
                    <th style={{ ...th, width: '8%'  }}>Status</th>
                    <th style={{ ...th, width: '9%'  }}>Joined</th>
                    <th style={{ ...th, width: '10%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => {
                    const even = i % 2 === 0;
                    const bg   = even ? '#ffffff' : 'rgba(124,58,237,0.016)';
                    const hoverBg = 'rgba(124,58,237,0.055)';

                    return (
                      <tr key={s._id}
                        onMouseEnter={e => [...e.currentTarget.cells].forEach(c => c.style.background = hoverBg)}
                        onMouseLeave={e => [...e.currentTarget.cells].forEach(c => c.style.background = bg)}
                      >
                        {/* # */}
                        <td style={cell({ background: bg, fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', width: 48 })}>
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>

                        {/* Name — left-aligned with avatar */}
                        <td style={cell({ background: bg, textAlign: 'left', paddingLeft: 16 })}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: avatarGrad(s.name),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, color: '#fff',
                              boxShadow: '0 2px 8px rgba(124,58,237,0.22)',
                            }}>
                              {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                              {s.name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={cell({ background: bg, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 0 })}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                            {s.email}
                          </span>
                        </td>

                        {/* Phone */}
                        <td style={cell({ background: bg, fontWeight: 500, letterSpacing: '0.3px' })}>
                          {s.phone || '—'}
                        </td>

                        {/* Designation */}
                        <td style={cell({ background: bg })}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px', borderRadius: 20,
                            background: 'rgba(124,58,237,0.09)',
                            border: '1px solid rgba(124,58,237,0.18)',
                            color: '#5b21b6',
                            fontSize: 11, fontWeight: 600,
                            whiteSpace: 'normal',
                            textAlign: 'center',
                            lineHeight: 1.3,
                          }}>
                            {s.designation || '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={cell({ background: bg })}>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <StatusBadge status={s.isActive ? 'Active' : 'Inactive'} />
                          </div>
                        </td>

                        {/* Joined */}
                        <td style={cell({ background: bg, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 })}>
                          {new Date(s.joinDate || s.createdAt).toLocaleDateString('en-IN')}
                        </td>

                        {/* Actions */}
                        <td style={cell({ background: bg })}>
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', alignItems: 'center' }}>
                            <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(s)}>
                              <MdEdit />
                            </button>
                            <button
                              className={`btn btn-sm btn-icon ${s.isActive ? 'btn-danger' : 'btn-outline'}`}
                              title={s.isActive ? 'Deactivate' : 'Activate'}
                              onClick={() => toggleActive(s)}
                            >
                              {s.isActive ? <MdPersonOff /> : <MdCheckCircle />}
                            </button>
                            <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(s._id)}>
                              <MdDelete />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Pagination ── */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px',
              borderTop: '1px solid var(--border-glass)',
              background: 'rgba(124,58,237,0.02)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Showing <b style={{ color: 'var(--text-primary)' }}>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</b> of <b style={{ color: 'var(--text-primary)' }}>{filtered.length.toLocaleString()}</b> staff
              </span>

              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '4px 12px', fontSize: 12 }}>← Prev</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '…' ? (
                      <span key={`e-${idx}`} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 2px' }}>…</span>
                    ) : (
                      <button key={p}
                        className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPage(p)}
                        style={{ padding: '4px 10px', fontSize: 12, minWidth: 32 }}
                      >{p}</button>
                    )
                  )}

                <button className="btn btn-ghost btn-sm" disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '4px 12px', fontSize: 12 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editMode ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" placeholder="Enter full name"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-control" type="email" placeholder="email@tileshow.com"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" placeholder="9876543210"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <select className="form-control"
                      value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
                      <option value="">Select designation…</option>
                      {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{editMode ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input className="form-control" type="password" placeholder="••••••••"
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editMode ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
