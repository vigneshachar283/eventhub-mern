import { useEffect, useState } from 'react';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [cancelling, setCancelling] = useState(null); // bookingId being cancelled

  useEffect(() => {
    api.get('/bookings/mine')
      .then(({ data }) => setBookings(data.bookings))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(bookingId) {
    setCancelling(bookingId);
    try {
      const { data } = await api.patch(`/bookings/${bookingId}/cancel`);
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? data.booking : b))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(null);
    }
  }

  if (loading) return <Loader fullPage />;

  return (
    <main className="bookings-page">
      <h1>My Bookings</h1>
      <ErrorMessage message={error} />

      {bookings.length === 0 && !error && (
        <p className="bookings-page__empty">You have no bookings yet.</p>
      )}

      <ul className="booking-list">
        {bookings.map((b) => {
          const ev = b.event; // may be null if event was deleted
          const isConfirmed = b.status === 'confirmed';

          return (
            <li key={b._id} className={`booking-item booking-item--${b.status}`}>
              <div className="booking-item__info">
                {ev ? (
                  <>
                    <strong className="booking-item__title">{ev.title}</strong>
                    <span>📍 {ev.venue}</span>
                    <span>📅 {new Date(ev.date).toLocaleDateString()}</span>
                  </>
                ) : (
                  <strong className="booking-item__title">Event no longer available</strong>
                )}
                <span>
                  {b.seats} seat{b.seats !== 1 ? 's' : ''} &middot; ${b.totalPrice.toFixed(2)}
                </span>
                <span className={`booking-item__status booking-item__status--${b.status}`}>
                  {b.status}
                </span>
              </div>

              {isConfirmed && (
                <button
                  className="btn btn--outline btn--danger"
                  onClick={() => handleCancel(b._id)}
                  disabled={cancelling === b._id}
                  aria-label={`Cancel booking for ${ev?.title ?? 'this event'}`}
                >
                  {cancelling === b._id ? 'Cancelling…' : 'Cancel'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
