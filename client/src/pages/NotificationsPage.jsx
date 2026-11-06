import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  CheckCheck,
  CheckCircle,
  RefreshCw,
  Trash2,
  Star,
  Phone,
  User,
  UserPlus,
  Calendar,
  Filter,
  Search,
  MessageSquareQuote,
  ShoppingBag,
  Copy,
  ExternalLink,
  MapPin,
  Package,
} from 'lucide-react';

const RATING_LABELS = {
  behaviour: 'Staff Behaviour',
  helpfulness: 'Helpfulness',
  productKnowledge: 'Product Knowledge',
  tileCollection: 'Tile Collection',
  pricingExplanation: 'Pricing Explanation',
  overallExperience: 'Overall Experience',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refresh,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'visits' | 'unread' | 'feedback' | 'complaint'
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState({});

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text, label = 'Feedback Link') => {
    if (!text) return toast.error('No link available');
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Filter out any mock/generated seed notifications (e.g. Rajesh Nair)
  const realNotifications = useMemo(() => {
    return notifications.filter(
      (n) => (n.metadata?.customerName || '').toLowerCase() !== 'rajesh nair'
    );
  }, [notifications]);

  // Metrics
  const totalCount = realNotifications.length;
  const visitCount = realNotifications.filter((n) => n.type === 'visit').length;
  const feedbackCount = realNotifications.filter((n) => n.type === 'feedback').length;
  const complaintCount = realNotifications.filter(
    (n) => n.type === 'complaint' || n.metadata?.hasComplaint
  ).length;

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return realNotifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && !n.unread) return false;
      if (activeTab === 'visits' && n.type !== 'visit') return false;
      if (activeTab === 'feedback' && (n.type !== 'feedback' || n.metadata?.hasComplaint)) return false;
      if (activeTab === 'complaint' && n.type !== 'complaint' && !n.metadata?.hasComplaint) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const customer = (n.metadata?.customerName || '').toLowerCase();
        const staff = (n.metadata?.staffName || '').toLowerCase();
        const mobile = (n.metadata?.customerMobile || '').toLowerCase();
        const comments = (n.metadata?.comments || '').toLowerCase();
        const category = (n.metadata?.complaintCategory || '').toLowerCase();
        const purpose = (n.metadata?.visitPurpose || '').toLowerCase();
        const status = (n.metadata?.purchaseStatus || '').toLowerCase();
        const stock = (n.metadata?.stockRequested || '').toLowerCase();
        const msg = (n.message || '').toLowerCase();
        const title = (n.title || '').toLowerCase();
        if (
          !customer.includes(q) &&
          !staff.includes(q) &&
          !mobile.includes(q) &&
          !comments.includes(q) &&
          !category.includes(q) &&
          !purpose.includes(q) &&
          !status.includes(q) &&
          !stock.includes(q) &&
          !msg.includes(q) &&
          !title.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [realNotifications, activeTab, search]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Topbar
        title="Live Customer Notifications"
        subtitle={
          user?.role === 'admin'
            ? 'Unified live feed of customer visits logged by staff, customer feedback & complaints'
            : 'Live feed of customer visits registered, feedback & ratings for your showroom visits'
        }
      />

      <div className="page-content fade-in">
        {/* Summary Stat Cards */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
              <Bell size={20} />
            </div>
            <div>
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Notifications</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)', color: '#0891b2' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: '#0891b2' }}>{visitCount}</div>
              <div className="stat-label">Live Customer Visits</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="stat-value">{feedbackCount}</div>
              <div className="stat-label">Customer Feedback</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="stat-value" style={{ color: complaintCount > 0 ? '#dc2626' : 'inherit' }}>
                {complaintCount}
              </div>
              <div className="stat-label">Customer Complaints</div>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('all')}
              className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 20 }}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('visits')}
              className={`btn btn-sm ${activeTab === 'visits' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 20,
                background: activeTab === 'visits' ? 'var(--accent-purple)' : 'transparent',
                borderColor: activeTab === 'visits' ? 'var(--accent-purple)' : 'transparent',
              }}
            >
              👤 Customer Visits ({visitCount})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`btn btn-sm ${activeTab === 'unread' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 20 }}
            >
              🔴 Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`btn btn-sm ${activeTab === 'feedback' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 20 }}
            >
              ⭐ Feedback Only ({feedbackCount})
            </button>
            <button
              onClick={() => setActiveTab('complaint')}
              className={`btn btn-sm ${activeTab === 'complaint' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 20 }}
            >
              🚨 Complaints ({complaintCount})
            </button>
          </div>

          {/* Search & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search customer, staff, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control form-control-sm"
                style={{ paddingLeft: 34, borderRadius: 20, fontSize: 13 }}
              />
            </div>

            {unreadCount > 0 && (
              <button
                className="btn btn-sm btn-outline"
                onClick={markAllAsRead}
                title="Mark all notifications as read"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCheck size={16} /> Mark all as read
              </button>
            )}

            {realNotifications.length > 0 && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all notifications?')) {
                    clearAllNotifications();
                  }
                }}
                title="Clear all notifications"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}
              >
                <Trash2 size={16} /> Clear all
              </button>
            )}

            {user?.role === 'staff' && (
              <Link
                to="/staff/visit"
                className="btn btn-sm btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                title="Register a new customer visit"
              >
                <UserPlus size={16} /> + Register Visit
              </Link>
            )}

            <button
              className="btn btn-sm btn-ghost"
              onClick={refresh}
              title="Refresh notifications"
              style={{ padding: '6px 10px' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        {filteredNotifications.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}
          >
            <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No Notifications Found</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {activeTab === 'unread'
                ? "You're all caught up! No unread customer alerts."
                : activeTab === 'visits'
                ? 'No customer visit notifications recorded yet.'
                : 'No customer notifications match your current filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredNotifications.map((notif) => {
              const meta = notif.metadata || {};
              const isVisit = notif.type === 'visit';
              const isComplaint = notif.type === 'complaint' || meta.hasComplaint;
              const hasBreakdown = meta.ratings && Object.keys(meta.ratings).length > 0;
              const isExpanded = !!expandedCards[notif._id];

              return (
                <div
                  key={notif._id}
                  className="card fade-in"
                  style={{
                    padding: '20px 24px',
                    borderRadius: 14,
                    border: notif.unread
                      ? isComplaint
                        ? '1.5px solid rgba(239,68,68,0.45)'
                        : isVisit
                        ? '1.5px solid rgba(6,182,212,0.45)'
                        : '1.5px solid rgba(124,58,237,0.4)'
                      : '1px solid var(--border-glass)',
                    background: notif.unread
                      ? isComplaint
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                        : isVisit
                        ? 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(255,255,255,0.02) 100%)'
                        : 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(6,182,212,0.02) 100%)'
                    : 'var(--card-bg, #ffffff)',
                    boxShadow: notif.unread
                      ? '0 6px 20px rgba(124,58,237,0.08)'
                      : '0 2px 10px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      flexWrap: 'wrap',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* Type Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: isComplaint
                            ? 'rgba(239,68,68,0.12)'
                            : isVisit
                            ? meta.isRepeatVisit
                              ? 'rgba(124,58,237,0.12)'
                              : 'rgba(6,182,212,0.14)'
                            : 'rgba(16,185,129,0.12)',
                          color: isComplaint
                            ? '#dc2626'
                            : isVisit
                            ? meta.isRepeatVisit
                              ? '#7c3aed'
                              : '#0891b2'
                            : '#059669',
                        }}
                      >
                        {isComplaint ? (
                          <AlertTriangle size={14} />
                        ) : isVisit ? (
                          meta.isRepeatVisit ? (
                            <RefreshCw size={14} />
                          ) : (
                            <UserPlus size={14} />
                          )
                        ) : (
                          <Star size={14} />
                        )}
                        {isComplaint
                          ? 'Customer Complaint'
                          : isVisit
                          ? meta.isRepeatVisit
                            ? `Repeat Visit (#${meta.visitNumber || 2})`
                            : 'Live Customer Visit'
                          : 'Customer Feedback'}
                      </span>

                      {/* Customer Type Tag */}
                      {meta.customerType && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: 'rgba(0,0,0,0.04)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {meta.customerType}
                        </span>
                      )}

                      {/* Unread Pill */}
                      {notif.unread && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: '#ef4444',
                            color: 'white',
                            letterSpacing: 0.3,
                          }}
                        >
                          NEW
                        </span>
                      )}

                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {notif.unread && (
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => markAsRead(notif._id)}
                          style={{ fontSize: 12, color: 'var(--primary)' }}
                          title="Mark as read"
                        >
                          <CheckCircle size={14} style={{ marginRight: 4 }} /> Mark Read
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => deleteNotification(notif._id)}
                        style={{ color: 'var(--text-muted)' }}
                        title="Remove notification"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Headline */}
                  <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {notif.title}
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {notif.message}
                  </p>

                  {/* Customer & Staff Info Strip */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                      padding: '12px 16px',
                      background: 'rgba(0,0,0,0.02)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 10,
                      marginBottom: 16,
                      fontSize: 13,
                    }}
                  >
                    {/* Customer Name & Phone */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Customer
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={14} style={{ color: 'var(--primary)' }} />
                        {meta.customerName || 'Customer'}
                      </div>
                      {meta.customerMobile && (
                        <div style={{ fontSize: 12, color: '#0891b2', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <Phone size={13} />
                          <a href={`tel:${meta.customerMobile}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {meta.customerMobile}
                          </a>
                        </div>
                      )}
                      {meta.address && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} />
                          {meta.address}
                        </div>
                      )}
                    </div>

                    {/* Attending Staff */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Attending Staff
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                        {meta.staffName || 'Staff Member'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Logged in showroom
                      </div>
                    </div>

                    {/* Visit Date & Purpose */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Visit Date & Purpose
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                        {meta.visitDate
                          ? new Date(meta.visitDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : new Date(notif.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                      </div>
                      {meta.visitPurpose && (
                        <div style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, marginTop: 2 }}>
                          {meta.visitPurpose}
                        </div>
                      )}
                    </div>

                    {/* Purchase Outcome & Billing Value for Visits */}
                    {isVisit && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Purchase Outcome
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span
                            style={{
                              background:
                                meta.purchaseStatus === 'Purchased' ? '#10b981' : '#f59e0b',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {meta.purchaseStatus || 'Purchased'}
                          </span>
                        </div>
                        {meta.purchaseStatus === 'Purchased' && meta.totalBillingValue > 0 && (
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#059669', marginTop: 4 }}>
                            ₹{Number(meta.totalBillingValue).toLocaleString('en-IN')}
                          </div>
                        )}
                        {meta.purchaseStatus === 'Not Purchased' && meta.nonPurchaseReason && (
                          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                            {meta.nonPurchaseReason}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Overall Rating for Feedback */}
                    {!isVisit && meta.rating > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Overall Rating
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <span
                            style={{
                              background: '#f59e0b',
                              color: 'white',
                              fontWeight: 800,
                              fontSize: 13,
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {meta.rating} ★
                          </span>
                          {meta.recommendationScore > 0 && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              NPS: {meta.recommendationScore}/10
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visit Specific Details Section: Tile Stock & Repeat Reasons */}
                  {isVisit && (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(6,182,212,0.04)',
                        border: '1px solid rgba(6,182,212,0.18)',
                        borderRadius: 10,
                        marginBottom: 16,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 12,
                        fontSize: 13,
                      }}
                    >
                      {/* Tile Stock Requested */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', marginBottom: 2 }}>
                          📦 Tile Stock Requested
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {meta.stockRequested || 'Showroom Display Selection'}
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: meta.stockAvailable === 'Yes' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color: meta.stockAvailable === 'Yes' ? '#059669' : '#dc2626',
                            }}
                          >
                            {meta.stockAvailable === 'Yes' ? '✅ In Stock' : '❌ Out of Stock'}
                          </span>
                          {meta.stockNotes && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              ({meta.stockNotes})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lead Source & Repeat Information */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', marginBottom: 2 }}>
                          📍 Lead Source & History
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          Source: {meta.source || 'Walk-in / Signboard'}
                        </div>
                        {meta.isRepeatVisit && (
                          <div style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, marginTop: 4 }}>
                            🔁 Repeat Reason: {meta.repeatReason || 'Follow-up on Previous Enquiry'}
                          </div>
                        )}
                      </div>

                      {/* Notes if provided */}
                      {meta.notes && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', marginBottom: 2 }}>
                            📝 Staff Notes
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            "{meta.notes}"
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback Breakdown (if feedback type) */}
                  {hasBreakdown && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          Rating Breakdown (6 Categories)
                        </span>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => toggleExpand(notif._id)}
                          style={{ fontSize: 11, color: 'var(--primary)' }}
                        >
                          {isExpanded ? 'Hide Details ▲' : 'Show Details ▼'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 8,
                            padding: 12,
                            background: 'rgba(124,58,237,0.03)',
                            border: '1px solid rgba(124,58,237,0.1)',
                            borderRadius: 10,
                          }}
                        >
                          {Object.entries(meta.ratings).map(([key, val]) => (
                            <div
                              key={key}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: 12,
                                padding: '4px 6px',
                              }}
                            >
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {RATING_LABELS[key] || key}:
                              </span>
                              <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                                {'★'.repeat(val)}
                                {'☆'.repeat(Math.max(0, 5 - val))} ({val}/5)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Comments & Suggestions */}
                  {(meta.comments || meta.suggestions) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 14 }}>
                      {meta.comments && (
                        <div
                          style={{
                            padding: '10px 14px',
                            background: 'rgba(6,182,212,0.05)',
                            borderLeft: '3px solid #06b6d4',
                            borderRadius: '0 8px 8px 0',
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', marginBottom: 4 }}>
                            💬 Customer Comments
                          </div>
                          <div style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                            "{meta.comments}"
                          </div>
                        </div>
                      )}

                      {meta.suggestions && (
                        <div
                          style={{
                            padding: '10px 14px',
                            background: 'rgba(16,185,129,0.05)',
                            borderLeft: '3px solid #10b981',
                            borderRadius: '0 8px 8px 0',
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: 4 }}>
                            💡 Suggestions for Improvement
                          </div>
                          <div style={{ color: 'var(--text-primary)' }}>
                            {meta.suggestions}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complaint Section */}
                  {isComplaint && (
                    <div
                      style={{
                        padding: '14px 18px',
                        background: 'rgba(239,68,68,0.06)',
                        border: '1.5px solid rgba(239,68,68,0.35)',
                        borderRadius: 10,
                        marginTop: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#dc2626', fontSize: 13 }}>
                          <AlertTriangle size={14} /> Complaint Category: {meta.complaintCategory || 'Other'}
                        </div>
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin/complaints"
                            className="btn btn-xs btn-outline"
                            style={{ borderColor: '#ef4444', color: '#dc2626', fontSize: 11 }}
                          >
                            Resolve in Complaints →
                          </Link>
                        )}
                      </div>
                      {meta.complaintDescription && (
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginTop: 4 }}>
                          {meta.complaintDescription}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Link Footer / Action Buttons */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {isVisit ? (
                        <Link
                          to={user?.role === 'admin' ? '/admin/visits' : '/staff/my-visits'}
                          className="btn btn-xs btn-primary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <User size={13} /> View Customer Visit Details →
                        </Link>
                      ) : (
                        <Link
                          to={user?.role === 'admin' ? '/admin/feedback' : '/staff/feedback'}
                          className="btn btn-xs btn-primary"
                          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <MessageSquareQuote size={13} /> View Feedback Details →
                        </Link>
                      )}

                      {meta.feedbackLink && (
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => copyToClipboard(meta.feedbackLink, 'Customer Feedback Link')}
                          style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Copy size={13} /> Copy Feedback Link
                        </button>
                      )}
                    </div>

                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Logged at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
