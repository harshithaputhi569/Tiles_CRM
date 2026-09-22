export function StatCard({ icon, label, value, change, changeType = 'positive', iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: iconBg || 'rgba(124,58,237,0.15)', color: iconColor || '#8b5cf6' }}>
        {icon}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {change !== undefined && (
        <div className={`stat-change ${changeType}`}>
          {changeType === 'positive' ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
}

export function Stars({ rating, max = 5 }) {
  return (
    <span className="stars">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star${i < Math.round(rating) ? '' : ' empty'}`}>★</span>
      ))}
    </span>
  );
}

export function Badge({ children, type = 'gray' }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function LoadingSpinner() {
  return <div className="loading-center"><div className="loading-spinner" /></div>;
}

export function EmptyState({ icon = '📭', message = 'No data found', sub }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <p>{message}</p>
      {sub && <span>{sub}</span>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    'Pending': 'yellow',
    'In Progress': 'cyan',
    'Resolved': 'green',
    'Active': 'green',
    'Inactive': 'red',
  };
  return <Badge type={map[status] || 'gray'}>{status}</Badge>;
}

export function RatingBadge({ rating }) {
  const r = parseFloat(rating);
  const type = r >= 4 ? 'green' : r >= 3 ? 'yellow' : 'red';
  return <Badge type={type}>{'★'.repeat(Math.round(r))} {r?.toFixed(1)}</Badge>;
}
