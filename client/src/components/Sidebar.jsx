import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard, Users, MessageSquare, AlertTriangle, BarChart3,
  UserPlus, Star, LogOut, Store, X, Menu, ClipboardList
} from 'lucide-react';

const adminNav = [
  { label: 'MAIN', items: [
    { to: '/admin/dashboard',     icon: <LayoutDashboard size={18} />,     label: 'Dashboard' },
    { to: '/admin/analytics',     icon: <BarChart3 size={18} />,      label: 'Analytics' },
  ]},
  { label: 'VISITS', items: [
    { to: '/admin/visits',        icon: <ClipboardList size={18} />,          label: 'All Visits' },
  ]},
  { label: 'MANAGEMENT', items: [
    { to: '/admin/staff',         icon: <Users size={18} />,        label: 'Staff' },
    { to: '/admin/feedback',      icon: <MessageSquare size={18} />,      label: 'Feedback',   hasBadge: true },
    { to: '/admin/complaints',    icon: <AlertTriangle size={18} />,       label: 'Complaints' },
  ]},
];

const staffNav = [
  { label: 'MAIN', items: [
    { to: '/staff/dashboard',     icon: <LayoutDashboard size={18} />,     label: 'Dashboard' },
    { to: '/staff/performance',   icon: <Star size={18} />,          label: 'Performance' },
  ]},
  { label: 'VISITS', items: [
    { to: '/staff/visit',         icon: <UserPlus size={18} />,     label: 'Register Visit' },
    { to: '/staff/my-visits',     icon: <ClipboardList size={18} />,          label: 'My Visits' },
  ]},
  { label: 'FEEDBACK', items: [
    { to: '/staff/feedback',      icon: <MessageSquare size={18} />,      label: 'Customer Feedback', hasBadge: true },
  ]},
];

// Flat list for the bottom nav bar (mobile) — max 5 items
const adminBottomNav = [
  { to: '/admin/dashboard',     icon: <LayoutDashboard size={18} />,     label: 'Home' },
  { to: '/admin/visits',        icon: <ClipboardList size={18} />,          label: 'Visits' },
  { to: '/admin/feedback',      icon: <MessageSquare size={18} />,      label: 'Feedback', hasBadge: true },
  { to: '/admin/complaints',    icon: <AlertTriangle size={18} />,       label: 'Complaints' },
  { to: '/admin/analytics',     icon: <BarChart3 size={18} />,      label: 'Analytics' },
];

const staffBottomNav = [
  { to: '/staff/dashboard',     icon: <LayoutDashboard size={18} />,     label: 'Home' },
  { to: '/staff/visit',         icon: <UserPlus size={18} />,     label: 'Register' },
  { to: '/staff/my-visits',     icon: <ClipboardList size={18} />,          label: 'Visits' },
  { to: '/staff/feedback',      icon: <MessageSquare size={18} />,      label: 'Feedback', hasBadge: true },
  { to: '/staff/performance',   icon: <Star size={18} />,          label: 'Perf' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { isOpen, open, close } = useSidebar();
  const navItems = user?.role === 'admin' ? adminNav : staffNav;
  const bottomNavItems = user?.role === 'admin' ? adminBottomNav : staffBottomNav;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    close();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={close} aria-hidden="true" />
      )}

      {/* Desktop / drawer sidebar */}
      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Store size={18} color="white" />
            </div>
            <div>
              <div className="logo-text">TileShow</div>
              <div className="logo-sub">CRM System</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={handleNavClick}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.hasBadge && unreadCount > 0 && (
                    <span
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 12,
                        minWidth: 18,
                        textAlign: 'center',
                        boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ===== MOBILE BOTTOM NAV BAR ===== */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={close}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <span className="bottom-nav-icon">{item.icon}</span>
              {item.hasBadge && unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    background: '#ef4444',
                    color: 'white',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 10,
                    minWidth: 14,
                    textAlign: 'center',
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
        {/* More / logout button */}
        <button className="bottom-nav-item bottom-nav-more" onClick={open} aria-label="More options">
          <span className="bottom-nav-icon"><Menu size={18} /></span>
          <span className="bottom-nav-label">More</span>
        </button>
      </nav>
    </>
  );
}
