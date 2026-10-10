import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent]         = useState(null);
  const [seats, setSeats]         = useState(1);
  const [loading, setLoading]     = useState(true);
  const [booking, setBooking]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(({ data }) => setEvent(data.event))
      .catch((err) => setError(err.response?.data?.message || 'Event not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBook(e) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setError('');
    setSuccess('');
    setBooking(true);
    try {
      await api.post(`/events/${id}/book`, { seats });
      // Refresh event to show updated availableSeats
      const { data } = await api.get(`/events/${id}`);
      setEvent(data.event);
      setSuccess(`Successfully booked ${seats} seat${seats > 1 ? 's' : ''}!`);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <Loader fullPage />;
  if (!event)  return <main className="detail-page"><ErrorMessage message={error || 'Event not found'} /></main>;

  const isPast     = new Date(event.date) <= new Date();
  const soldOut    = event.availableSeats === 0;
  const canBook    = user?.role === 'attendee' && !isPast && !soldOut;

  const formattedDate = new Date(event.date).toLocaleString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <main className="detail-page">
      <div className="detail-page__header">
        <span className="event-card__category">{event.category}</span>
        {soldOut && <span className="event-card__badge">Sold out</span>}
        {isPast  && <span className="event-card__badge event-card__badge--past">Past event</span>}
      </div>

      <h1>{event.title}</h1>
      <p className="detail-page__meta">📍 {event.venue}</p>
      <p className="detail-page__meta">📅 {formattedDate}</p>
      <p className="detail-page__meta">
        Organised by <strong>{event.organizer?.name}</strong>
      </p>

      <p className="detail-page__description">{event.description}</p>

      <div className="detail-page__seats">
        <strong>{event.availableSeats}</strong> of <strong>{event.totalSeats}</strong> seats available
        &nbsp;·&nbsp;
        {event.price === 0 ? 'Free' : `$${event.price} per seat`}
      </div>

      <ErrorMessage message={error} />
      {success && <p className="success-message" role="status">{success}</p>}

      {canBook && (
        <form className="booking-form" onSubmit={handleBook}>
          <label>
            Seats
            <input
              type="number"
              min={1}
              max={Math.min(10, event.availableSeats)}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </label>
          <p className="booking-form__total">
            Total: {event.price === 0 ? 'Free' : `$${(event.price * seats).toFixed(2)}`}
          </p>
          <button type="submit" className="btn btn--primary" disabled={booking}>
            {booking ? 'Booking…' : `Book ${seats} seat${seats > 1 ? 's' : ''}`}
          </button>
        </form>
      )}

      {!user && !isPast && !soldOut && (
        <p className="detail-page__login-cta">
          <a href="/login">Sign in</a> to book seats.
        </p>
      )}
    </main>
  );
}
