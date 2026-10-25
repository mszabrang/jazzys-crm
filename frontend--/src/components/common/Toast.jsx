export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
          <path
            d="M5 8l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
          <path
            d="M8 5v3M8 10.5v.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}

      {toast.message}
    </div>
  );
}