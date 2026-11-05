import { useState, useEffect, useMemo } from 'react';
import Topbar from '../../components/Topbar';
import { LoadingSpinner, EmptyState, RatingBadge, Stars } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Star,
  Search,
  Calendar,
  Pin,
  Mail,
  MailCheck,
  MailWarning,
  Check,
  CheckCheck,
  CheckCircle2,
  RotateCw,
  X,
  Phone,
  User,
  AlertTriangle,
  Lightbulb,
  FileText,
  SlidersHorizontal,
  Clock,
  FilterX,
  Eye,
  Sparkles,
  Trash2,
} from 'lucide-react';

export default function FeedbackManagement() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // Filter States
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'pinned' | 'read' | 'complaint'
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    staff: '',
    rating: '',
    hasComplaint: '',
    startDate: '',
    endDate: '',
  });
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'

  // Summary counts from server
  const [counts, setCounts] = useState({
    total: 0,
    unreadCount: 0,
    pinnedCount: 0,
    totalAll: 0,
  });

  const [actionLoading, setActionLoading] = useState({});

  // Fetch staff list for filter dropdown (admin only)
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/staff').then((r) => setStaff(r.data)).catch(() => {});
    }
  }, [user]);

  // Build API Query
  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filters.staff) p.set('staff', filters.staff);
    if (filters.rating) p.set('rating', filters.rating);
    if (filters.hasComplaint !== '') p.set('hasComplaint', filters.hasComplaint);
    if (filters.startDate) p.set('startDate', filters.startDate);
    if (filters.endDate) p.set('endDate', filters.endDate);
    if (search.trim()) p.set('search', search.trim());

    // Tab-specific filters
    if (activeTab === 'unread') p.set('unreadOnly', 'true');
    else if (activeTab === 'pinned') p.set('pinnedOnly', 'true');
    else if (activeTab === 'read') p.set('isRead', 'true');
    else if (activeTab === 'complaint') p.set('hasComplaint', 'true');

    p.set('limit', '100');
    return p.toString();
  };

  const fetchFeedbacks = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/feedback?${buildQuery()}`);
      setFeedbacks(data.feedbacks || []);
      setCounts({
        total: data.total || (data.feedbacks || []).length,
        unreadCount: data.unreadCount || 0,
        pinnedCount: data.pinnedCount || 0,
        totalAll: data.totalAll || 0,
      });
    } catch {
      toast.error('Failed to load feedbacks');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filters, activeTab]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeedbacks();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Date Preset Handlers
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setFilters((prev) => ({ ...prev, startDate: '', endDate: '' }));
    } else if (preset === 'today') {
      setFilters((prev) => ({ ...prev, startDate: todayStr, endDate: todayStr }));
    } else if (preset === 'week') {
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFilters((prev) => ({ ...prev, startDate: past, endDate: todayStr }));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setFilters((prev) => ({ ...prev, startDate: firstDay, endDate: todayStr }));
    }
  };

  // Toggle Pin Status (Pins item to top)
  const togglePin = async (id, e) => {
    if (e) e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const { data } = await api.patch(`/feedback/${id}/pin`);
      const updated = data.feedback;
      setFeedbacks((prev) =>
        prev
          .map((f) => (f._id === id ? { ...f, isPinned: updated.isPinned, pinnedAt: updated.pinnedAt } : f))
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          })
      );
      setCounts((prev) => ({
        ...prev,
        pinnedCount: updated.isPinned ? prev.pinnedCount + 1 : Math.max(0, prev.pinnedCount - 1),
      }));
      if (selected && selected._id === id) {
        setSelected((prev) => ({ ...prev, isPinned: updated.isPinned, pinnedAt: updated.pinnedAt }));
      }
      toast.success(updated.isPinned ? 'Feedback pinned to top' : 'Feedback unpinned');
    } catch {
      toast.error('Failed to update pin status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Toggle Read / Unread Status
  const toggleRead = async (id, currentRead, e) => {
    if (e) e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const nextRead = !currentRead;
      const { data } = await api.patch(`/feedback/${id}/read`, { isRead: nextRead });
      const updated = data.feedback;

      setFeedbacks((prev) =>
        prev.map((f) => (f._id === id ? { ...f, isRead: updated.isRead } : f))
      );
      setCounts((prev) => ({
        ...prev,
        unreadCount: updated.isRead ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount + 1,
      }));
      if (selected && selected._id === id) {
        setSelected((prev) => ({ ...prev, isRead: updated.isRead }));
      }
      toast.success(updated.isRead ? 'Feedback marked as read' : 'Marked as unread');
    } catch {
      toast.error('Failed to update read status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // View Details and Auto-Mark as Read
  const handleViewDetails = async (f) => {
    setSelected(f);
    if (!f.isRead) {
      // Optimistically mark as read immediately in UI so unread count updates instantly
      setFeedbacks((prev) =>
        prev.map((item) => (item._id === f._id ? { ...item, isRead: true } : item))
      );
      setCounts((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
      setSelected((prev) => (prev && prev._id === f._id ? { ...prev, isRead: true } : prev));

      try {
        await api.patch(`/feedback/${f._id}/read`, { isRead: true });
      } catch (err) {
        console.error('Failed to auto-mark feedback as read:', err);
        // Rollback state on error
        setFeedbacks((prev) =>
          prev.map((item) => (item._id === f._id ? { ...item, isRead: false } : item))
        );
        setCounts((prev) => ({
          ...prev,
          unreadCount: prev.unreadCount + 1,
        }));
        setSelected((prev) => (prev && prev._id === f._id ? { ...prev, isRead: false } : prev));
      }
    }
  };

  // Delete Feedback Record (Admin only)
  const handleDeleteFeedback = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this feedback record? This action cannot be undone.')) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.delete(`/feedback/${id}`);
      setFeedbacks((prev) => prev.filter((f) => f._id !== id));
      setCounts((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        totalAll: Math.max(0, prev.totalAll - 1),
      }));
      if (selected && selected._id === id) {
        setSelected(null);
      }
      toast.success('Feedback record deleted');
    } catch {
      toast.error('Failed to delete feedback');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Mark All As Read
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/feedback/mark-all-read');
      setFeedbacks((prev) => prev.map((f) => ({ ...f, isRead: true })));
      setCounts((prev) => ({ ...prev, unreadCount: 0 }));
      toast.success('All feedback marked as read');
    } catch {
      toast.error('Failed to mark all feedback as read');
    }
  };

  // Clear all filters
  const resetFilters = () => {
    setSearch('');
    setDatePreset('all');
    setActiveTab('all');
    setFilters({ staff: '', rating: '', hasComplaint: '', startDate: '', endDate: '' });
  };

  // Calculate high-level stats for ribbon cards
  const stats = useMemo(() => {
    const total = counts.totalAll || feedbacks.length;
    const unread = counts.unreadCount;
    const pinned = counts.pinnedCount;
    const withComplaints = feedbacks.filter((f) => f.hasComplaint).length;
    const avgScore =
      feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + (f.overallRating || 0), 0) / feedbacks.length).toFixed(1)
        : '0.0';
    return { total, unread, pinned, withComplaints, avgScore };
  }, [feedbacks, counts]);

  const hasActiveFilters = Boolean(
    search || filters.staff || filters.rating || filters.startDate || filters.endDate || activeTab !== 'all'
  );

  const RatingRow = ({ label, value }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--border-glass)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Stars rating={value} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{value}/5</span>
      </div>
    </div>
  );

  return (
    <>
      <Topbar
        title="Customer Feedback Module"
        subtitle="Dedicated hub for all customer reviews, ratings, search & date filters, and pinned feedbacks"
      />

      <div className="page-content fade-in">
        {/* ===== TOP STATS CARDS RIBBON ===== */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 124,
            }}
            onClick={() => setActiveTab('all')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', marginBottom: 0 }}>
                <MessageSquare size={20} />
              </div>
            </div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Feedbacks</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 124,
              border: stats.unread > 0 ? '1px solid rgba(239,68,68,0.45)' : undefined,
              background: stats.unread > 0 ? 'linear-gradient(135deg, rgba(239,68,68,0.04), #ffffff)' : undefined,
            }}
            onClick={() => setActiveTab('unread')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', marginBottom: 0 }}>
                <MailWarning size={20} />
              </div>
              {stats.unread > 0 && (
                <span
                  style={{
                    color: '#dc2626',
                    fontWeight: 800,
                    fontSize: 10,
                    background: 'rgba(239,68,68,0.12)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    letterSpacing: 0.5,
                  }}
                >
                  NEW
                </span>
              )}
            </div>
            <div>
              <div className="stat-value" style={{ color: stats.unread > 0 ? '#dc2626' : 'inherit' }}>
                {stats.unread}
              </div>
              <div className="stat-label">Unread Feedbacks</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 124,
              border: stats.pinned > 0 ? '1px solid rgba(245,158,11,0.4)' : undefined,
            }}
            onClick={() => setActiveTab('pinned')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', marginBottom: 0 }}>
                <Pin size={20} />
              </div>
            </div>
            <div>
              <div className="stat-value" style={{ color: stats.pinned > 0 ? '#d97706' : 'inherit' }}>
                {stats.pinned}
              </div>
              <div className="stat-label">Pinned on Top</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 124,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', marginBottom: 0 }}>
                <Star size={20} />
              </div>
            </div>
            <div>
              <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {stats.avgScore} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ 5</span>
              </div>
              <div className="stat-label">Overall Avg Rating</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 124,
              border: stats.withComplaints > 0 ? '1px solid rgba(244,63,94,0.35)' : undefined,
            }}
            onClick={() => setActiveTab('complaint')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="stat-icon" style={{ background: 'rgba(244,63,94,0.12)', color: '#e11d48', marginBottom: 0 }}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div>
              <div className="stat-value" style={{ color: stats.withComplaints > 0 ? '#e11d48' : 'inherit' }}>
                {stats.withComplaints}
              </div>
              <div className="stat-label">With Complaints</div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CONTROL & FILTER CARD ===== */}
        <div
          className="card feedback-filter-card fade-in"
          style={{
            marginBottom: 20,
            padding: '20px 24px',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'visible',
          }}
        >
          {/* Header row: Tabs & Batch Action */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              borderBottom: '1px solid var(--border-glass)',
              paddingBottom: 16,
              marginBottom: 16,
            }}
          >
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                }}
                onClick={() => setActiveTab('all')}
              >
                <MessageSquare size={14} />
                <span>All Feedbacks</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: activeTab === 'all' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                    color: activeTab === 'all' ? '#fff' : 'inherit',
                    fontWeight: 700,
                  }}
                >
                  {counts.totalAll || feedbacks.length}
                </span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'unread' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: 20,
                  background: activeTab === 'unread' ? '#dc2626' : undefined,
                  borderColor: activeTab === 'unread' ? '#dc2626' : undefined,
                  color: activeTab === 'unread' ? '#fff' : counts.unreadCount > 0 ? '#dc2626' : undefined,
                  fontWeight: counts.unreadCount > 0 ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                }}
                onClick={() => setActiveTab('unread')}
              >
                <Mail size={14} />
                <span>Unread</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: activeTab === 'unread' ? 'rgba(255,255,255,0.25)' : 'rgba(220,38,38,0.12)',
                    color: activeTab === 'unread' ? '#fff' : '#dc2626',
                    fontWeight: 700,
                  }}
                >
                  {counts.unreadCount}
                </span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'pinned' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: 20,
                  background: activeTab === 'pinned' ? '#d97706' : undefined,
                  borderColor: activeTab === 'pinned' ? '#d97706' : undefined,
                  color: activeTab === 'pinned' ? '#fff' : counts.pinnedCount > 0 ? '#d97706' : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                }}
                onClick={() => setActiveTab('pinned')}
              >
                <Pin size={14} />
                <span>Pinned</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: activeTab === 'pinned' ? 'rgba(255,255,255,0.25)' : 'rgba(217,119,6,0.12)',
                    color: activeTab === 'pinned' ? '#fff' : '#d97706',
                    fontWeight: 700,
                  }}
                >
                  {counts.pinnedCount}
                </span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'read' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                }}
                onClick={() => setActiveTab('read')}
              >
                <CheckCircle2 size={14} />
                <span>Read Only</span>
              </button>

              <button
                className={`btn btn-sm ${activeTab === 'complaint' ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: 20,
                  background: activeTab === 'complaint' ? '#e11d48' : undefined,
                  borderColor: activeTab === 'complaint' ? '#e11d48' : undefined,
                  color: activeTab === 'complaint' ? '#fff' : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                }}
                onClick={() => setActiveTab('complaint')}
              >
                <AlertTriangle size={14} />
                <span>Complaints</span>
                {stats.withComplaints > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: activeTab === 'complaint' ? 'rgba(255,255,255,0.25)' : 'rgba(225,29,72,0.12)',
                      color: activeTab === 'complaint' ? '#fff' : '#e11d48',
                      fontWeight: 700,
                    }}
                  >
                    {stats.withComplaints}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Actions (Mark all read, refresh) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {counts.unreadCount > 0 && (
                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleMarkAllAsRead}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, borderRadius: 8 }}
                  title="Mark all feedbacks as read"
                >
                  <CheckCheck size={16} style={{ color: '#059669' }} />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => fetchFeedbacks()}
                title="Refresh feedbacks"
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          {/* Search & Date Filter Bar — Symmetrically Aligned Grid */}
          <div
            className={`feedback-filter-grid ${user?.role === 'admin' ? 'admin-view' : 'staff-view'}`}
            style={{
              display: 'grid',
              gridTemplateColumns:
                user?.role === 'admin'
                  ? 'minmax(220px, 2.2fr) minmax(130px, 1fr) minmax(130px, 1fr) minmax(160px, 1.2fr) minmax(150px, 1.1fr)'
                  : 'minmax(260px, 2.5fr) minmax(135px, 1fr) minmax(135px, 1fr) minmax(165px, 1.2fr)',
              gap: 14,
              alignItems: 'flex-start',
              width: '100%',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Search size={12} style={{ color: 'var(--accent-purple)' }} /> Search
              </span>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Customer, mobile, staff, comment..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    height: 40,
                    paddingLeft: 36,
                    paddingRight: search ? 34 : 12,
                    borderRadius: 10,
                    fontSize: 13,
                    background: '#ffffff',
                    border: '1px solid var(--border-glass)',
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Date Range: From */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Calendar size={12} style={{ color: 'var(--accent-purple)' }} /> From Date
              </span>
              <input
                type="date"
                className="form-control"
                value={filters.startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setFilters({ ...filters, startDate: e.target.value });
                }}
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  background: '#ffffff',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Date Range: To */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Calendar size={12} style={{ color: 'var(--accent-purple)' }} /> To Date
              </span>
              <input
                type="date"
                className="form-control"
                value={filters.endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setFilters({ ...filters, endDate: e.target.value });
                }}
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  background: '#ffffff',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Staff Dropdown (admin view) */}
            {user?.role === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <User size={12} style={{ color: 'var(--accent-purple)' }} /> Staff Member
                </span>
                <select
                  className="form-control"
                  value={filters.staff}
                  onChange={(e) => setFilters({ ...filters, staff: e.target.value })}
                  style={{
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 10,
                    fontSize: 13,
                    background: '#ffffff',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <option value="">All Staff Members</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.designation || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Rating Filter Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <Star size={12} style={{ color: 'var(--accent-purple)' }} /> Star Rating
              </span>
              <select
                className="form-control"
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 13,
                  background: '#ffffff',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <option value="">All Star Ratings</option>
                <option value="5">★ 5 Stars (Excellent)</option>
                <option value="4">★ 4 Stars (Good)</option>
                <option value="3">★ 3 Stars (Average)</option>
                <option value="2">★ 2 Stars (Poor)</option>
                <option value="1">★ 1 Star (Very Poor)</option>
              </select>
            </div>
          </div>

          {/* Quick Date Presets Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--border-glass)',
              flexWrap: 'wrap',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                <Clock size={13} /> Quick Date:
              </span>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyDatePreset(p.id)}
                  className={`btn btn-xs ${datePreset === p.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: 16,
                    padding: '4px 12px',
                    fontWeight: datePreset === p.id ? 700 : 500,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasActiveFilters && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={resetFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    color: 'var(--text-muted)',
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <FilterX size={13} /> Clear Filters
                </button>
              )}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  background: 'rgba(124,58,237,0.05)',
                  border: '1px solid rgba(124,58,237,0.12)',
                  padding: '4px 10px',
                  borderRadius: 8,
                }}
              >
                <SlidersHorizontal size={12} style={{ color: 'var(--accent-purple)' }} />
                Showing {feedbacks.length} records
              </span>
            </div>
          </div>
        </div>

        {/* ===== FEEDBACKS TABLE ===== */}
        <div className="card fade-in">
          {loading ? (
            <LoadingSpinner />
          ) : feedbacks.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={38} style={{ color: 'var(--accent-purple)', opacity: 0.6 }} />}
              message="No feedback records found"
              sub={
                activeTab === 'unread'
                  ? 'All caught up! There are no unread customer feedbacks.'
                  : activeTab === 'pinned'
                  ? 'No pinned feedbacks. Click the pin icon next to any feedback to keep it on top.'
                  : 'Try adjusting your date range or search filters.'
              }
            />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: 'center' }} title="Pinned Status">
                      <Pin size={14} style={{ display: 'inline', color: 'var(--text-muted)' }} />
                    </th>
                    <th>Customer</th>
                    <th>Staff</th>
                    <th>Visit Purpose</th>
                    <th>Overall Rating</th>
                    <th>NPS / Rec.</th>
                    <th>Comments Snippet</th>
                    <th>Complaint</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((f) => {
                    const isUnread = !f.isRead;
                    const isPinned = !!f.isPinned;

                    return (
                      <tr
                        key={f._id}
                        onClick={() => handleViewDetails(f)}
                        style={{
                          cursor: 'pointer',
                          background: isPinned
                            ? 'rgba(245, 158, 11, 0.04)'
                            : isUnread
                            ? 'rgba(124, 58, 237, 0.02)'
                            : undefined,
                          borderLeft: isPinned
                            ? '4px solid #f59e0b'
                            : isUnread
                            ? '4px solid #7c3aed'
                            : '4px solid transparent',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Pin status icon */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={(e) => togglePin(f._id, e)}
                            disabled={actionLoading[f._id]}
                            className="btn btn-ghost btn-icon btn-xs"
                            title={isPinned ? 'Click to unpin from top' : 'Click to pin to top'}
                            style={{
                              color: isPinned ? '#f59e0b' : 'var(--text-muted)',
                              padding: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Pin size={15} fill={isPinned ? '#f59e0b' : 'none'} />
                          </button>
                        </td>

                        {/* Customer Info */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                              {f.customer?.name || 'Walk-in Customer'}
                            </div>
                            {isPinned && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 8,
                                  background: 'rgba(245,158,11,0.15)',
                                  color: '#d97706',
                                  letterSpacing: 0.3,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <Pin size={9} /> PINNED
                              </span>
                            )}
                            {isUnread && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 8,
                                  background: 'rgba(239,68,68,0.12)',
                                  color: '#dc2626',
                                  letterSpacing: 0.3,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <Sparkles size={9} /> NEW
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {f.customer?.mobile && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Phone size={11} /> {f.customer.mobile} ·
                              </span>
                            )}
                            <span>{f.customer?.customerType || 'Customer'}</span>
                          </div>
                        </td>

                        {/* Staff */}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {f.staff?.name || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {f.staff?.designation || 'Staff'}
                          </div>
                        </td>

                        {/* Visit Purpose */}
                        <td style={{ fontSize: 13 }}>
                          {f.visit?.purpose ? (
                            <span style={{ color: 'var(--text-secondary)' }}>{f.visit.purpose}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Overall Rating */}
                        <td>
                          <RatingBadge rating={f.overallRating} />
                        </td>

                        {/* Recommendation NPS */}
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: 14,
                              fontSize: 12,
                              fontWeight: 700,
                              background:
                                f.recommendationScore >= 7
                                  ? 'rgba(16,185,129,0.14)'
                                  : 'rgba(239,68,68,0.14)',
                              color: f.recommendationScore >= 7 ? '#059669' : '#dc2626',
                            }}
                          >
                            {f.recommendationScore}/10
                          </span>
                        </td>

                        {/* Comments Snippet */}
                        <td style={{ maxWidth: 220 }}>
                          {f.comments ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontStyle: 'italic',
                              }}
                              title={f.comments}
                            >
                              "{f.comments}"
                            </div>
                          ) : f.suggestions ? (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--accent-purple)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title={f.suggestions}
                            >
                              <Lightbulb size={13} style={{ color: '#eab308', flexShrink: 0 }} />
                              <span>{f.suggestions}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No written comment</span>
                          )}
                        </td>

                        {/* Complaint Status */}
                        <td>
                          {f.hasComplaint ? (
                            <span
                              className="badge badge-red"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11 }}
                            >
                              <AlertTriangle size={12} /> Complaint
                            </span>
                          ) : (
                            <span
                              className="badge badge-green"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11 }}
                            >
                              <Check size={12} /> Clear
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(f.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Row Actions: Read/Unread, Pin, Details, Delete */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {/* Read / Unread toggle */}
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={(e) => toggleRead(f._id, f.isRead, e)}
                              disabled={actionLoading[f._id]}
                              title={f.isRead ? 'Mark as Unread' : 'Mark as Read'}
                              style={{
                                color: f.isRead ? 'var(--text-muted)' : '#059669',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                              }}
                            >
                              {f.isRead ? <Mail size={13} /> : <MailCheck size={13} />}
                              <span style={{ fontSize: 11 }}>{f.isRead ? 'Unread' : 'Read'}</span>
                            </button>

                            {/* Pin / Unpin button */}
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={(e) => togglePin(f._id, e)}
                              disabled={actionLoading[f._id]}
                              title={isPinned ? 'Unpin' : 'Pin to top'}
                              style={{
                                color: isPinned ? '#d97706' : 'var(--text-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                              }}
                            >
                              <Pin size={13} fill={isPinned ? '#d97706' : 'none'} />
                              <span style={{ fontSize: 11 }}>{isPinned ? 'Pinned' : 'Pin'}</span>
                            </button>

                            {/* Details modal trigger */}
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={(e) => { e.stopPropagation(); handleViewDetails(f); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12 }}
                            >
                              <Eye size={12} />
                              <span>Details</span>
                            </button>

                            {/* Delete button (admin only) */}
                            {user?.role === 'admin' && (
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => handleDeleteFeedback(f._id, e)}
                                disabled={actionLoading[f._id]}
                                title="Delete feedback record"
                                style={{
                                  color: 'var(--text-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 6px',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== FULL FEEDBACK DETAIL MODAL ===== */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="modal" style={{ maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="modal-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} style={{ color: 'var(--accent-purple)' }} />
                  <span>Customer Feedback Details</span>
                </span>
                {selected.isPinned && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      background: 'rgba(245,158,11,0.15)',
                      color: '#d97706',
                      padding: '2px 8px',
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Pin size={11} /> PINNED
                  </span>
                )}
                {!selected.isRead && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      background: 'rgba(239,68,68,0.15)',
                      color: '#dc2626',
                      padding: '2px 8px',
                      borderRadius: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Sparkles size={11} /> NEW UNREAD
                  </span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setSelected(null)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Quick Action Bar inside modal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(124,58,237,0.04)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 10,
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Submitted on {new Date(selected.createdAt).toLocaleString('en-IN')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className={`btn btn-xs ${selected.isPinned ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => togglePin(selected._id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Pin size={13} fill={selected.isPinned ? '#fff' : 'none'} />
                    <span>{selected.isPinned ? 'Unpin' : 'Pin to Top'}</span>
                  </button>

                  <button
                    className={`btn btn-xs ${selected.isRead ? 'btn-ghost' : 'btn-outline'}`}
                    onClick={() => toggleRead(selected._id, selected.isRead)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {selected.isRead ? <Mail size={13} /> : <MailCheck size={13} />}
                    <span>{selected.isRead ? 'Mark as Unread' : 'Mark as Read'}</span>
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      className="btn btn-xs btn-outline"
                      onClick={() => handleDeleteFeedback(selected._id)}
                      disabled={actionLoading[selected._id]}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        borderColor: 'rgba(239,68,68,0.3)',
                        color: '#dc2626',
                      }}
                      title="Delete this feedback record"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Customer and Staff Cards */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                    CUSTOMER DETAILS
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {selected.customer?.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {selected.customer?.mobile && (
                      <span style={{ color: '#0891b2', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} /> {selected.customer.mobile} ·{' '}
                      </span>
                    )}
                    <span>{selected.customer?.customerType}</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                    STAFF ASSIGNED
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {selected.staff?.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {selected.staff?.designation || 'Sales Executive'}
                  </div>
                </div>
              </div>

              {/* Ratings Breakdown (6 Categories) */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Ratings Breakdown (6 Categories)
                </div>
                <RatingRow label="Staff Behaviour" value={selected.ratings?.behaviour} />
                <RatingRow label="Helpfulness" value={selected.ratings?.helpfulness} />
                <RatingRow label="Product Knowledge" value={selected.ratings?.productKnowledge} />
                <RatingRow label="Tile Collection" value={selected.ratings?.tileCollection} />
                <RatingRow label="Pricing Explanation" value={selected.ratings?.pricingExplanation} />
                <RatingRow label="Overall Experience" value={selected.ratings?.overallExperience} />
              </div>

              {/* Score Highlights */}
              <div className="form-grid-2" style={{ marginBottom: 16 }}>
                <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                    Recommendation NPS Score
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      marginTop: 2,
                      color: selected.recommendationScore >= 7 ? '#059669' : '#dc2626',
                    }}
                  >
                    {selected.recommendationScore}/10
                  </div>
                </div>

                <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                    Overall Average Rating
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      marginTop: 2,
                      color: 'var(--accent-purple)',
                    }}
                  >
                    {selected.overallRating}/5
                  </div>
                </div>
              </div>

              {/* Written Comments */}
              {selected.comments && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
                    CUSTOMER COMMENTS
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(6,182,212,0.05)',
                      borderLeft: '4px solid #06b6d4',
                      borderRadius: 8,
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                    }}
                  >
                    "{selected.comments}"
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {selected.suggestions && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>
                    CUSTOMER SUGGESTIONS
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(16,185,129,0.05)',
                      borderLeft: '4px solid #10b981',
                      borderRadius: 8,
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Lightbulb size={16} style={{ color: '#eab308', flexShrink: 0 }} />
                    <span>{selected.suggestions}</span>
                  </div>
                </div>
              )}

              {/* Complaint Status */}
              {selected.hasComplaint && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#dc2626',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <span>A customer complaint was registered with this feedback submission.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
