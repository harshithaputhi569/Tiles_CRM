import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdDashboard, MdPeople, MdFeedback, MdWarning, MdBarChart,
  MdFileDownload, MdPersonAdd, MdAssignment, MdStar, MdLogout,
  MdStorefront,
} from 'react-icons/md';

const adminNav = [
  { label: 'MAIN', items: [
    { to: '/admin/dashboard', icon: <MdDashboard />, label: 'Dashboard' },
    { to: '/admin/analytics', icon: <MdBarChart />,  label: 'Analytics' },
  ]},
  { label: 'MANAGEMENT', items: [
    { to: '/admin/staff',      icon: <MdPeople />,      label: 'Staff Management' },
    { to: '/admin/feedback',   icon: <MdFeedback />,    label: 'Feedback' },
    { to: '/admin/complaints', icon: <MdWarning />,     label: 'Complaints' },
  ]},
  { label: 'REPORTS', items: [
    { to: '/admin/reports',    icon: <MdFileDownload />, label: 'Reports & Export' },
  ]},
];

const staffNav = [
  { label: 'MAIN', items: [
    { to: '/staff/dashboard', icon: <MdDashboard />, label: 'My Dashboard' },
    { to: '/staff/performance', icon: <MdStar />, label: 'My Performance' },
  ]},
  { label: 'ACTIONS', items: [
    { to: '/staff/visit', icon: <MdPersonAdd />, label: 'Register Visit' },
    { to: '/staff/feedback', icon: <MdFeedback />, label: 'Submit Feedback' },
  ]},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? adminNav : staffNav;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
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
  );
}
