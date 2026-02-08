// ============================================================
// Toast Notification Container — clickable toasts
// ============================================================

import { useNotificationStore } from '../../store/notificationStore';
import { useMarketStore } from '../../store/marketStore';

export const ToastContainer = () => {
  const visibleToasts = useNotificationStore(s => s.visibleToasts);
  const dismissToast = useNotificationStore(s => s.dismissToast);
  const selectToken = useMarketStore(s => s.selectToken);

  if (visibleToasts.length === 0) return null;

  const handleClick = (toast: typeof visibleToasts[0]) => {
    if (toast.tokenId) {
      selectToken(toast.tokenId);
    }
    dismissToast(toast.id);
  };

  return (
    <div className="toast-container">
      {visibleToasts.map(toast => (
        <div
          key={toast.id}
          className={`toast ${toast.tokenId ? 'toast-clickable' : ''}`}
          onClick={() => handleClick(toast)}
        >
          <div className="toast-icon">{toast.icon}</div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <div className="toast-close" onClick={e => { e.stopPropagation(); dismissToast(toast.id); }}>✕</div>
        </div>
      ))}
    </div>
  );
};
