import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdMenu, MdNotifications, MdCheck, MdOpenInNew, MdStar, MdWarning } from 'react-icons/md';
import { useSidebar } from '../context/SidebarContext';
import { useNotifications } from '../context/NotificationContext';

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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
    if (notif.link) {
      navigate(notif.link);
    }
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
                width: 360,
                maxWidth: '90vw',
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
                    Notifications
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
                  >
                    <MdCheck /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>No notifications yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      You'll be alerted here whenever a customer submits feedback or files a complaint.
                    </div>
                  </div>
                ) : (
                  notifications.map((n) => (
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
                          background:
                            n.type === 'complaint'
                              ? 'rgba(239,68,68,0.12)'
                              : 'rgba(245,158,11,0.12)',
                          color: n.type === 'complaint' ? '#dc2626' : '#d97706',
                        }}
                      >
                        {n.type === 'complaint' ? <MdWarning /> : <MdStar />}
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
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.title}
                          </span>
                          {n.unread && (
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--accent-purple)',
                                flexShrink: 0,
                                marginLeft: 6,
                              }}
                            />
                          )}
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
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
                          {formatTimeAgo(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
