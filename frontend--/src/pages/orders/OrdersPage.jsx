import { useEffect, useState } from 'react';
import { API, authFetch } from '../../utils/api';
import { formatMoney, formatDate } from '../../utils/formatters';
import { getRole } from '../../utils/auth';
import Spinner from '../../components/common/Spinner';
import Toast from '../../components/common/Toast';
import StatusBadge from '../../components/common/StatusBadge';
import PaymentBadge from '../../components/common/PaymentBadge';
import ActionMenu from '../../components/common/ActionMenu';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AddOrderModal from '../../components/orders/AddOrderModal';
import UpdatePaymentModal from '../../components/orders/UpdatePaymentModal';
import useToast from '../../hooks/useToast';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, show: showToast } = useToast();
  const role = getRole();
  const canManage = role !== 'production';

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch(`${API}/api/orders/get-orders`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || 'Failed to load orders.');
          return;
        }
        setOrders(data.orders || []);
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [refresh]);

  async function confirmDelete() {
    setDeleteLoading(true);
    try {
      const response = await authFetch(`${API}/api/orders/delete-order/${deleting.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || 'Could not delete this order.', 'error');
      } else {
        showToast('Order deleted.');
        setRefresh((r) => !r);
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.customer_first_name?.toLowerCase().includes(q) ||
      o.customer_last_name?.toLowerCase().includes(q) ||
      o.staff_first_name?.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-header">
        <h1>Orders</h1>
        {canManage && (
          <button className="btn btn--primary" onClick={() => setShowModal(true)}>
            New Order
          </button>
        )}
      </div>

      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loader-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="page-error">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="empty-state">
          {search ? 'No orders match your search.' : 'No orders yet.'}
        </p>
      ) : (
        <div className="list">
          {filtered.map((order) => (
            <div
              className={`list-card list-card--clickable list-card--wrap ${canManage ? 'list-card--menu' : ''}`}
              key={order.id}
              onClick={() => setPaymentOrder(order)}
            >
              <div className="list-card__info">
                <p className="list-card__name">
                  {order.customer_first_name} {order.customer_last_name}
                </p>
                <p className="list-card__meta">
                  Staff: {order.staff_first_name} {order.staff_last_name}
                </p>
                <p className="list-card__meta">Due: {formatDate(order.due_date)}</p>
                <p className="list-card__meta">
                  {formatMoney(order.amount)} — Paid: {formatMoney(order.amount_paid)}
                </p>
              </div>
              <div className="list-card__badges">
                <StatusBadge status={order.status} />
                <PaymentBadge amount={order.amount} amountPaid={order.amount_paid} />
              </div>

              {order.description && (
                <div className="list-card__description">
                  <span className="list-card__description-label">Description</span>
                  {order.description}
                </div>
              )}

              {canManage && (
                <ActionMenu onEdit={() => setPaymentOrder(order)} onDelete={() => setDeleting(order)} />
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddOrderModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            showToast(msg);
            setRefresh((r) => !r);
          }}
        />
      )}

      {paymentOrder && (
        <UpdatePaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onSuccess={(msg) => {
            showToast(msg);
            setRefresh((r) => !r);
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete order?"
          message={`The order for ${deleting.customer_first_name || ''} ${deleting.customer_last_name || ''} will be permanently deleted. Revenue stats and the customer's purchase count will change. This can't be undone.`}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}