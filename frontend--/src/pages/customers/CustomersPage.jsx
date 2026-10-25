import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, authFetch } from '../../utils/api';
import Spinner from '../../components/common/Spinner';
import Toast from '../../components/common/Toast';
import ActionMenu from '../../components/common/ActionMenu';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AddCustomerModal from '../../components/customers/AddCustomerModal';
import EditCustomerModal from '../../components/customers/EditCustomerModal';
import useToast from '../../hooks/useToast';

function purchaseLabel(n) {
  if (!n) return 'No purchases yet';
  return n === 1 ? '1 purchase' : `${n} purchases`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState('');

  const { toast, show: showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await authFetch(`${API}/api/customers/get-customers`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Failed to load customers.');
          return;
        }

        setCustomers(data.customers);
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
      const response = await authFetch(`${API}/api/customers/delete-customer/${deleting.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || 'Could not delete this customer.', 'error');
      } else {
        showToast('Customer deleted.');
        setRefresh((r) => !r);
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();

    return (
      c.first_name?.toLowerCase().includes(q) ||
      c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone_number?.includes(q)
    );
  });

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-header">
        <h1>Customers</h1>

        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          Add Customer
        </button>
      </div>

      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          placeholder="Search customers..."
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
          {search ? 'No customers match your search.' : 'No customers yet. Add your first one.'}
        </p>
      ) : (
        <div className="list">
          {filtered.map((customer) => (
            <div
              className="list-card list-card--clickable list-card--menu"
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <div className="list-card__info">
                <p className="list-card__name">
                  {customer.first_name} {customer.last_name}
                </p>

                <p className="list-card__meta">{customer.phone_number}</p>

                <p className="list-card__meta">{customer.email}</p>

                <div className="list-card__tags">
                  <span className={`badge badge--small ${customer.purchase_count > 0 ? 'badge--info' : 'badge--neutral'}`}>
                    {purchaseLabel(customer.purchase_count)}
                  </span>
                </div>
              </div>

              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="list-card__arrow"
              >
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <ActionMenu onEdit={() => setEditing(customer)} onDelete={() => setDeleting(customer)} />
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddCustomerModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            showToast(msg);
            setRefresh((r) => !r);
          }}
        />
      )}

      {editing && (
        <EditCustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSuccess={(msg) => {
            showToast(msg);
            setRefresh((r) => !r);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete customer?"
          message={`${deleting.first_name} ${deleting.last_name} and their saved measurements will be permanently deleted. Their orders are kept (and still show their name). This can't be undone.`}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}