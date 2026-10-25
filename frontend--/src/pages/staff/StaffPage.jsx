import { useEffect, useState } from 'react';
import { API, authFetch } from '../../utils/api';
import { decodeToken } from '../../utils/auth';
import Spinner from '../../components/common/Spinner';
import Toast from '../../components/common/Toast';
import ActionMenu from '../../components/common/ActionMenu';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AddStaffModal from '../../components/staff/AddStaffModal';
import EditStaffModal from '../../components/staff/EditStaffModal';
import useToast from '../../hooks/useToast';

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, show: showToast } = useToast();

  const me = decodeToken(localStorage.getItem('token'));
  const myId = me?.Staff_ID;
  const myRole = me?.role;

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch(`${API}/api/staff/staff`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || 'Failed to load staff.');
          return;
        }
        setStaffList(data.allStaff || []);
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [refresh]);

  // Same rules the server enforces, so people only see buttons that will work
  function canEdit(member) {
    if (member.tier === 'super_admin') return member.id === myId;
    if (member.tier === 'admin') return myRole === 'super_admin';
    return true;
  }
  function canDelete(member) {
    return canEdit(member) && member.tier !== 'super_admin' && member.id !== myId;
  }

  async function confirmDelete() {
    setDeleteLoading(true);
    try {
      const response = await authFetch(`${API}/api/staff/delete-staff/${deleting.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || 'Could not delete this staff member.', 'error');
      } else {
        showToast('Staff member deleted.');
        setRefresh((r) => !r);
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleting(null);
    }
  }

  const filtered = staffList.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  const tierLabel = {
    admin: 'Admin',
    production: 'Production',
    super_admin: 'Super Admin',
  };

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-header">
        <h1>Staff</h1>
        <button
          className="btn btn--primary"
          onClick={() => setShowModal(true)}
        >
          Add Staff
        </button>
      </div>

      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Search staff..."
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
          {search ? 'No staff match your search.' : 'No staff added yet.'}
        </p>
      ) : (
        <div className="list">
          {filtered.map((member) => {
            const showMenu = canEdit(member) || canDelete(member);
            const handling = member.customers_handling ?? 0;
            const handled = member.customers_handled ?? 0;
            return (
              <div className={`list-card ${showMenu ? 'list-card--menu list-card--wrap' : 'list-card--wrap'}`} key={member.id}>
                <div className="list-card__info">
                  <p className="list-card__name">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="list-card__meta">{member.phone_number}</p>
                  <p className="list-card__meta">{member.email}</p>
                </div>
                <span className="badge badge--neutral">
                  {tierLabel[member.tier] || member.tier}
                </span>

                {showMenu && (
                  <ActionMenu
                    onEdit={canEdit(member) ? () => setEditing(member) : undefined}
                    onDelete={canDelete(member) ? () => setDeleting(member) : undefined}
                  />
                )}

                <div className="staff-stats">
                  <div className={`staff-stat ${handling > 0 ? 'staff-stat--active' : ''}`}>
                    <span className="staff-stat__num">{handling}</span>
                    <span className="staff-stat__label">Customers handling</span>
                  </div>
                  <div className="staff-stat">
                    <span className="staff-stat__num">{handled}</span>
                    <span className="staff-stat__label">Customers handled</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AddStaffModal
          onClose={() => setShowModal(false)}
          onSuccess={(msg) => {
            showToast(msg);
            setRefresh((r) => !r);
          }}
        />
      )}

      {editing && (
        <EditStaffModal
          member={editing}
          canChangeRole={myRole === 'super_admin' && editing.tier !== 'super_admin'}
          onClose={() => setEditing(null)}
          onSuccess={(msg) => {
            showToast(msg);
            setRefresh((r) => !r);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete staff member?"
          message={`${deleting.first_name} ${deleting.last_name} will lose access to the app straight away. Their orders are kept and will still show their name. This can't be undone.`}
          loading={deleteLoading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}