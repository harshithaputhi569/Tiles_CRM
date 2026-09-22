import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/UI';
import { MdAdd, MdEdit, MdDelete, MdPersonOff, MdCheckCircle, MdVisibility } from 'react-icons/md';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const emptyForm = { name: '', email: '', password: '', phone: '', designation: '' };

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/staff');
      setStaff(data);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditMode(false); setSelectedId(null); setShowModal(true); };
  const openEdit = (s) => { setForm({ name: s.name, email: s.email, password: '', phone: s.phone || '', designation: s.designation || '' }); setEditMode(true); setSelectedId(s._id); setShowModal(true); };

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

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Topbar title="Staff Management" subtitle="Add, edit, and manage staff members" />
      <div className="page-content">
        <div className="card fade-in">
          <div className="card-header">
            <span className="card-title">👥 All Staff Members ({filtered.length})</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input className="form-control" style={{ minWidth: 220 }}
                placeholder="🔍 Search staff..." value={search}
                onChange={e => setSearch(e.target.value)} />
              <button className="btn btn-primary" onClick={openAdd}>
                <MdAdd /> Add Staff
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : (
            filtered.length === 0 ? <EmptyState icon="👥" message="No staff found" /> : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Designation</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s._id}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0
                            }}>
                              {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                          </div>
                        </td>
                        <td>{s.email}</td>
                        <td>{s.phone || '—'}</td>
                        <td>{s.designation || '—'}</td>
                        <td><StatusBadge status={s.isActive ? 'Active' : 'Inactive'} /></td>
                        <td>{new Date(s.joinDate || s.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal */}
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
                    <input className="form-control" placeholder="Enter full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-control" type="email" placeholder="email@tileshow.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control" placeholder="9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input className="form-control" placeholder="Sales Executive" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{editMode ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
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
