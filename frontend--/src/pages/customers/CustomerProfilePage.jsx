import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API, authFetch } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import Spinner from '../../components/common/Spinner';
import Toast from '../../components/common/Toast';
import MeasurementInput from '../../components/common/MeasurementInput';
import useToast from '../../hooks/useToast';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [measurement, setMeasurement] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loadingMeasurement, setLoadingMeasurement] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast, show: showToast } = useToast();
  const navigate = useNavigate();

  const measurementFields = [
    ['shoulder', 'Shoulder'],
    ['roundShoulder', 'Round Shoulder'],
    ['bust', 'Bust'],
    ['underBust', 'Under Bust'],
    ['waist', 'Waist'],
    ['hips', 'Hips'],
    ['roundArm', 'Round Arm'],
    ['armHole', 'Arm Hole'],
    ['shortSleeveLength', 'Short Sleeve'],
    ['sleeve34', '3/4 Sleeve'],
    ['longSleeve', 'Long Sleeve'],
    ['topLength', 'Top Length'],
    ['shirtLength', 'Shirt Length'],
    ['trouserLength', 'Trouser Length'],
    ['tights', 'Tights'],
    ['skirtLength', 'Skirt Length'],
    ['length34', '3/4 Length'],
    ['fullLength', 'Full Length'],
  ];

  const emptyMeasurements = Object.fromEntries(
    measurementFields.map(([k]) => [k, ''])
  );

  const [form, setForm] = useState(emptyMeasurements);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoadingCustomer(true);
      setLoadingMeasurement(true);
      setError('');

      try {
        const cRes = await authFetch(
          `${API}/api/customers/get-a-customer/${id}`
        );
        const cData = await cRes.json();

        if (cancelled) return;

        if (!cRes.ok) {
          setError(cData.message || 'Failed to load customer.');
          setLoadingCustomer(false);
          setLoadingMeasurement(false);
          return;
        }

        setCustomer(cData.customer);
        setLoadingCustomer(false);

        const mRes = await authFetch(
          `${API}/api/measurements/get-measurement/${id}`
        );
        const mData = await mRes.json();

        if (cancelled) return;

        if (!mRes.ok) {
          // GET failed – still show the form as empty
          setMeasurement(null);
          setForm(emptyMeasurements);
          setLoadingMeasurement(false);
          return;
        }

        const m = mData.measurement;

        if (m) {
          setMeasurement(m);
          setForm({
            shoulder: m.shoulder ?? '',
            roundShoulder: m.round_shoulder ?? '',
            bust: m.bust ?? '',
            underBust: m.under_bust ?? '',
            waist: m.waist ?? '',
            hips: m.hips ?? '',
            roundArm: m.round_arm ?? '',
            armHole: m.arm_hole ?? '',
            shortSleeveLength: m.short_sleeve ?? '',
            sleeve34: m.three_quarter_sleeve ?? '',
            longSleeve: m.long_sleeve ?? '',
            topLength: m.top_length ?? '',
            shirtLength: m.shirt_length ?? '',
            trouserLength: m.trouser_length ?? '',
            tights: m.tights ?? '',
            skirtLength: m.skirt_length ?? '',
            length34: m.three_quarter_length ?? '',
            fullLength: m.full_length ?? '',
          });
        } else {
          setMeasurement(null);
          setForm(emptyMeasurements);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load customer data.');
        }
      } finally {
        if (!cancelled) {
          setLoadingCustomer(false);
          setLoadingMeasurement(false);
        }
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(key) {
    return (e) =>
      setForm((f) => ({
        ...f,
        [key]: e.target.value,
      }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = measurement
        ? `${API}/api/measurements/update-measurement/${id}`
        : `${API}/api/measurements/measurement`;

      const method = measurement ? 'PATCH' : 'POST';

      const body = measurement
        ? form
        : { ...form, Customer_ID: id };

      const response = await authFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.message || 'Something went wrong.', 'error');
        return;
      }

      showToast(data.message || 'Measurements saved.', 'success');

      if (data.measurement) {
        setMeasurement(data.measurement);
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <Toast toast={toast} />

      <button
        className="btn btn--ghost"
        style={{ marginBottom: '24px' }}
        onClick={() => navigate('/customers')}
      >
        ← Back to customers
      </button>

      {loadingCustomer ? (
        <div className="loader-center">
          <Spinner />
        </div>
      ) : error ? (
        <p className="page-error">{error}</p>
      ) : (
        <>
          {customer && (
            <div className="profile-header">
              <div className="profile-header__name">
                {customer.first_name} {customer.last_name}
              </div>

              <div className="profile-header__meta">
                {customer.phone_number}
              </div>

              <div className="profile-header__meta">
                {customer.email}
              </div>

              {customer.date_of_birth && (
                <div className="profile-header__meta">
                  Born: {formatDate(customer.date_of_birth)}
                </div>
              )}
            </div>
          )}

          <h2 className="section-title">Measurements</h2>

          {loadingMeasurement ? (
            <div className="loader-center">
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="measurement-grid">
                {measurementFields.map(([key, label]) => (
                  <MeasurementInput
                    key={key}
                    type="number"
                    onChange={handleChange(key)}
                    value={form[key]}
                    labelValue={label}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitting}
              >
                {submitting ? (
                  <Spinner />
                ) : measurement ? (
                  'Update Measurements'
                ) : (
                  'Save Measurements'
                )}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}