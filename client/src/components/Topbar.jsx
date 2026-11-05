import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdMenu,
  MdNotifications,
  MdCheck,
  MdOpenInNew,
  MdStar,
  MdWarning,
  MdPerson,
  MdPersonAdd,
  MdAutorenew,
  MdDeleteSweep,
  MdClose,
} from 'react-icons/md';
import { useSidebar } from '../context/SidebarContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function Topbar({ title, subtitle }) {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    deleteNotification,
  } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Filter out any dummy / generated test notifications
  const liveNotifications = notifications.filter(
    (n) => (n.metadata?.customerName || '').toLowerCase() !== 'rajesh nair'
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleNotificationClick = (notif) => {
    if (notif.unread) {
      markAsRead(notif._id);
    }
    setShowDropdown(false);

    const isAdmin = user?.role === 'admin';
    let targetLink = notif.link || '';

    // Fix legacy link
    if (targetLink === '/staff/visits') {
      targetLink = '/staff/my-visits';
    }

    if (targetLink) {
      navigate(targetLink);
      return;
    }

    // Smart fallback routing based on notification type and title
    if (notif.type === 'visit') {
      navigate(isAdmin ? '/admin/visits' : '/staff/my-visits');
    } else if (notif.type === 'feedback') {
      navigate(isAdmin ? '/admin/feedback' : '/staff/feedback');
    } else if (notif.type === 'complaint') {
      navigate(isAdmin ? '/admin/complaints' : '/staff/feedback');
    } else {
      // Special Day / general
      if (notif.title?.includes('Special Day') || notif.metadata?.visitId) {
        navigate(isAdmin ? '/admin/visits' : '/staff/my-visits');
      } else {
        navigate(isAdmin ? '/admin/dashboard' : '/staff/dashboard');
      }
    }
  };

  const getNotifStyle = (n) => {
    if (n.type === 'complaint' || n.metadata?.hasComplaint) {
      return {
        icon: <MdWarning />,
        bg: 'rgba(239,68,68,0.12)',
        color: '#dc2626',
      };
    }
    if (n.type === 'visit') {
      return {
        icon: n.metadata?.isRepeatVisit ? <MdAutorenew /> : <MdPersonAdd />,
        bg: n.metadata?.isRepeatVisit ? 'rgba(124,58,237,0.14)' : 'rgba(6,182,212,0.14)',
        color: n.metadata?.isRepeatVisit ? '#7c3aed' : '#0891b2',
      };
    }
    return {
      icon: <MdStar />,
      bg: 'rgba(245,158,11,0.12)',
      color: '#d97706',
    };
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="hamburger-btn" onClick={open} aria-label="Toggle sidebar menu">
          <MdMenu />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Notification Bell Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setShowDropdown((v) => !v)}
            aria-label="View notifications"
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: showDropdown ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)',
              border: '1px solid var(--border-glass)',
              color: unreadCount > 0 ? 'var(--accent-purple)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <MdNotifications style={{ fontSize: 20 }} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 800,
                  borderRadius: 10,
                  padding: '2px 6px',
                  lineHeight: 1,
                  border: '2px solid var(--bg-card)',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                  animation: 'pulse 2s infinite',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 48,
                right: 0,
                width: 380,
                maxWidth: '92vw',
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                borderRadius: 14,
                boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-glass)',
                  background: 'rgba(124,58,237,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Live Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: 'rgba(124,58,237,0.12)',
                        color: 'var(--accent-purple)',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--accent-purple)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Mark all notifications as read"
                    >
                      <MdCheck /> Mark all read
                    </button>
                  )}
                  {liveNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to clear all notifications?')) {
                          clearAllNotifications();
                        }
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Clear all notifications"
                    >
                      <MdDeleteSweep style={{ fontSize: 16 }} /> Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Items List */}
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {liveNotifications.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>No notifications yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      Live customer details sent by staff, feedback, and complaints will appear here in real-time.
                    </div>
                  </div>
                ) : (
                  liveNotifications.map((n) => {
                    const style = getNotifStyle(n);
                    return (
                      <div
                        key={n._id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-glass)',
                          background: n.unread ? 'rgba(124,58,237,0.04)' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.08)')}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = n.unread ? 'rgba(124,58,237,0.04)' : '#ffffff')
                        }
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            background: style.bg,
                            color: style.color,
                          }}
                        >
                          {style.icon}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: n.unread ? 800 : 600,
                              color: 'var(--text-primary)',
                              marginBottom: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {n.title}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {n.unread && (
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: 'var(--accent-purple)',
                                  }}
                                  title="Unread"
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(n._id);
                                }}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'var(--text-muted)',
                                  padding: '2px 4px',
                                  cursor: 'pointer',
                                  borderRadius: 4,
                                  fontSize: 13,
                                  opacity: 0.5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                                title="Dismiss notification"
                              >
                                <MdClose />
                              </button>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              lineHeight: 1.4,
                              marginBottom: 4,
                            }}
                          >
                            {n.message}
                          </div>

                          {/* Customer Details Chips for Visits */}
                          {n.type === 'visit' && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                              {n.metadata?.customerMobile && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    background: 'rgba(6,182,212,0.1)',
                                    color: '#0891b2',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                  }}
                                >
                                  📞 {n.metadata.customerMobile}
                                </span>
                              )}
                              {n.metadata?.staffName && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    background: 'rgba(0,0,0,0.04)',
                                    color: 'var(--text-secondary)',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  Staff: {n.metadata.staffName}
                                </span>
                              )}
                              {n.metadata?.purchaseStatus && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    background:
                                      n.metadata.purchaseStatus === 'Purchased'
                                        ? 'rgba(16,185,129,0.12)'
                                        : 'rgba(239,68,68,0.08)',
                                    color:
                                      n.metadata.purchaseStatus === 'Purchased' ? '#059669' : '#dc2626',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    fontWeight: 700,
                                  }}
                                >
                                  {n.metadata.purchaseStatus}
                                  {n.metadata.purchaseStatus === 'Purchased' &&
                                    n.metadata.totalBillingValue > 0 &&
                                    ` (₹${Number(n.metadata.totalBillingValue).toLocaleString('en-IN')})`}
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                            {formatTimeAgo(n.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(124,58,237,0.03)',
                  borderTop: '1px solid var(--border-glass)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {liveNotifications.length} Live Alert{liveNotifications.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    navigate(user?.role === 'admin' ? '/admin/notifications' : '/staff/notifications');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-purple)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  View All Live Details <MdOpenInNew />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="topbar-badge">
          <span className="dot" />
          Live
        </div>
        <div className="topbar-date">{dateStr}</div>
      </div>
    </header>
  );
}
