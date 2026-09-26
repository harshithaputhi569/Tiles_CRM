import { MdMenu } from 'react-icons/md';
import { useSidebar } from '../context/SidebarContext';

export default function Topbar({ title, subtitle }) {
  const { open } = useSidebar();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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
      <div className="topbar-right">
        <div className="topbar-badge">
          <span className="dot" />
          Live
        </div>
        <div className="topbar-date">{dateStr}</div>
      </div>
    </header>
  );
}
