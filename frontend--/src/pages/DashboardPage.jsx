import { useEffect, useState } from 'react';
import { API, authFetch } from '../utils/api';
import { formatMoney, formatDate } from '../utils/formatters';
import Spinner from '../components/common/Spinner';
import Dropdown from '../components/common/dropdown';
import StatusBadge from '../components/common/StatusBadge';
import PaymentBadge from '../components/common/PaymentBadge';
import useToast from '../hooks/useToast';

const PERIOD_OPTIONS = [
  { value: '30days', label: 'Last 30 days' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await authFetch(
          `${API}/api/stats/stats?period=${period}`
        );

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.message || 'Failed to load stats.'
          );
          return;
        }

        setStats(data);
      } catch {
        setError(
          'Network error. Could not load dashboard.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetch_();
  }, [period]);

  const statCards = stats
    ? [
        {
          label: 'Total Sales',
          value: formatMoney(stats.total_sales),
        },
        {
          label: 'Amount Collected',
          value: formatMoney(stats.total_paid),
        },
        {
          label: 'Outstanding',
          value: formatMoney(stats.unpaidAmount),
        },
        {
          label: 'Orders',
          value: stats.totalOrders,
        },
        {
          label: 'New Customers',
          value: stats.totalCustomers,
        },
      ]
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>

        <Dropdown
          compact
          label="Period"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {loading ? (
        <div className="loader-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="page-error">{error}</p>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map(({ label, value }) => (
              <div className="stat-card" key={label}>
                <p className="stat-card__value">
                  {value}
                </p>

                <p className="stat-card__label">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {stats.unpaidOrders?.length > 0 && (
            <>
              <h2 className="section-title">
                Unpaid Orders
              </h2>

              <div className="list">
                {stats.unpaidOrders.map((order) => (
                  <div
                    className="list-card"
                    key={order.id}
                  >
                    <div className="list-card__info">
                      <p className="list-card__name">
                        {order.customer_first_name}{' '}
                        {order.customer_last_name}
                      </p>

                      <p className="list-card__meta">
                        Staff: {order.staff_first_name}{' '}
                        {order.staff_last_name}
                      </p>

                      <p className="list-card__meta">
                        {formatMoney(order.amount)} — Paid:{' '}
                        {formatMoney(order.amount_paid)}
                      </p>
                    </div>

                    <PaymentBadge
                      amount={order.amount}
                      amountPaid={order.amount_paid}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {stats.dueThisWeek?.length > 0 && (
            <>
              <h2 className="section-title">
                Due This Week
              </h2>

              <div className="list">
                {stats.dueThisWeek.map((order) => (
                  <div
                    className="list-card"
                    key={order.id}
                  >
                    <div className="list-card__info">
                      <p className="list-card__name">
                        {order.customer_first_name}{' '}
                        {order.customer_last_name}
                      </p>

                      <p className="list-card__meta">
                        Due: {formatDate(order.due_date)}
                      </p>
                    </div>

                    <StatusBadge
                      status={order.status}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {stats.dueThisWeek?.length === 0 &&
            stats.unpaidOrders?.length === 0 && (
              <p className="empty-state">
                All caught up — no unpaid orders or
                upcoming due dates.
              </p>
            )}
        </>
      )}
    </div>
  );
}