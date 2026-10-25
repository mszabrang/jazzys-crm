export default function StatusBadge({ status }) {
  const map = {
    pending: 'badge--neutral',
    in_progress: 'badge--warning',
    ready: 'badge--info',
    delivered: 'badge--success',
  };

  return (
    <span className={`badge ${map[status] || 'badge--neutral'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}