export default function Topbar({ title, subtitle }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      <div className="topbar-right">
        <div className="topbar-badge">
          <span className="dot" />
          Live
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateStr}</div>
      </div>
    </header>
  );
}
