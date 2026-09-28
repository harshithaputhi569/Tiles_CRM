import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import {
  MdDashboard, MdPeople, MdFeedback, MdWarning, MdBarChart,
  MdFileDownload, MdPersonAdd, MdStar, MdLogout,
  MdStorefront, MdClose, MdMenu,
} from 'react-icons/md';

const adminNav = [
  { label: 'MAIN', items: [
    { to: '/admin/dashboard', icon: <MdDashboard />, label: 'Dashboard' },
    { to: '/admin/analytics', icon: <MdBarChart />,  label: 'Analytics' },
  ]},
  { label: 'MANAGEMENT', items: [
    { to: '/admin/staff',      icon: <MdPeople />,      label: 'Staff' },
    { to: '/admin/feedback',   icon: <MdFeedback />,    label: 'Feedback' },
    { to: '/admin/complaints', icon: <MdWarning />,     label: 'Complaints' },
  ]},
  { label: 'REPORTS', items: [
    { to: '/admin/reports',    icon: <MdFileDownload />, label: 'Reports' },
  ]},
];

const staffNav = [
  { label: 'MAIN', items: [
    { to: '/staff/dashboard', icon: <MdDashboard />, label: 'Dashboard' },
    { to: '/staff/performance', icon: <MdStar />, label: 'Performance' },
  ]},
  { label: 'ACTIONS', items: [
    { to: '/staff/visit', icon: <MdPersonAdd />, label: 'Register' },
    { to: '/staff/feedback', icon: <MdFeedback />, label: 'Feedback' },
  ]},
];

// Flat list for the bottom nav bar (mobile) — max 5 items
const adminBottomNav = [
  { to: '/admin/dashboard',   icon: <MdDashboard />,    label: 'Home' },
  { to: '/admin/analytics',   icon: <MdBarChart />,     label: 'Analytics' },
  { to: '/admin/staff',       icon: <MdPeople />,       label: 'Staff' },
  { to: '/admin/feedback',    icon: <MdFeedback />,     label: 'Feedback' },
  { to: '/admin/complaints',  icon: <MdWarning />,      label: 'Complaints' },
];

const staffBottomNav = [
  { to: '/staff/dashboard',    icon: <MdDashboard />,   label: 'Home' },
  { to: '/staff/performance',  icon: <MdStar />,        label: 'Performance' },
  { to: '/staff/visit',        icon: <MdPersonAdd />,   label: 'Register' },
  { to: '/staff/feedback',     icon: <MdFeedback />,    label: 'Feedback' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
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
              <MdStorefront style={{ color: 'white', fontSize: 18 }} />
            </div>
            <div>
              <div className="logo-text">TileShow</div>
              <div className="logo-sub">CRM System</div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={close} aria-label="Close menu">
            <MdClose />
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
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <MdLogout /> Logout
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
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
        {/* More / logout button */}
        <button className="bottom-nav-item bottom-nav-more" onClick={open} aria-label="More options">
          <span className="bottom-nav-icon"><MdMenu /></span>
          <span className="bottom-nav-label">More</span>
        </button>
      </nav>
    </>
  );
}
