import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

function AttendeeModal({ eventId, eventTitle, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get(`/events/${eventId}/bookings`)
      .then(({ data }) => setBookings(data.bookings))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load attendees'))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Attendees for ${eventTitle}`}>
      <div className="modal">
        <div className="modal__header">
          <h2>Attendees — {eventTitle}</h2>
          <button className="modal__close btn btn--outline btn--sm" onClick={onClose}>Close</button>
        </div>
        {loading && <Loader />}
        <ErrorMessage message={error} />
        {!loading && bookings.length === 0 && <p className="bookings-page__empty">No confirmed bookings yet.</p>}
        {bookings.length > 0 && (
          <table className="attendee-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Seats</th><th>Total paid</th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>{b.user?.name}</td>
                  <td>{b.user?.email}</td>
                  <td>{b.seats}</td>
                  <td>${b.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function OrganizerDashboard() {
  const [events, setEvents]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState(null);
  const [refresh, setRefresh]   = useState(0); // increment to re-fetch
  const [attendeeEvent, setAttendeeEvent] = useState(null); // { id, title }

  useEffect(() => {
    setLoading(true);
    api.get('/events/mine', { params: { page, limit: 10 } })
      .then(({ data }) => {
        setEvents(data.events);
        setTotal(data.total);
        setPages(data.pages);
        // If we deleted the last item on the last page, step back one page
        if (data.events.length === 0 && page > 1) setPage((p) => p - 1);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your events'))
      .finally(() => setLoading(false));
  }, [page, refresh]);

  async function handleDelete(eventId, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(eventId);
    setError('');
    try {
      await api.delete(`/events/${eventId}`);
      // Re-fetch instead of mutating local state — keeps pages/total accurate
      setRefresh((n) => n + 1);
    } catch (err) {
      // Surface the 409 "confirmed bookings" message clearly
      setError(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <Loader fullPage />;

  return (
    <main className="dashboard-page">
      <div className="dashboard-page__header">
        <h1>My Events <span className="events-page__count">({total})</span></h1>
        <Link to="/dashboard/new" className="btn btn--primary">+ New event</Link>
      </div>

      <ErrorMessage message={error} />

      {events.length === 0 && !error && (
        <p className="bookings-page__empty">
          No events yet. <Link to="/dashboard/new">Create your first one.</Link>
        </p>
      )}

      <ul className="dashboard-list">
        {events.map((ev) => {
          const isPast = new Date(ev.date) <= new Date();
          const booked = ev.totalSeats - ev.availableSeats;

          return (
            <li key={ev._id} className={`dashboard-item${isPast ? ' dashboard-item--past' : ''}`}>
              <div className="dashboard-item__info">
                <strong className="dashboard-item__title">{ev.title}</strong>
                <span>📅 {new Date(ev.date).toLocaleDateString()}</span>
                <span>📍 {ev.venue}</span>
                <span>
                  {booked} / {ev.totalSeats} booked &middot; {ev.availableSeats} available
                </span>
                {isPast && <span className="event-card__badge event-card__badge--past">Past</span>}
              </div>

              <div className="dashboard-item__actions">
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => setAttendeeEvent({ id: ev._id, title: ev.title })}
                >
                  Attendees ({booked})
                </button>
                <Link to={`/dashboard/edit/${ev._id}`} className="btn btn--outline btn--sm">
                  Edit
                </Link>
                <button
                  className="btn btn--outline btn--danger btn--sm"
                  onClick={() => handleDelete(ev._id, ev.title)}
                  disabled={deleting === ev._id}
                  aria-label={`Delete ${ev.title}`}
                >
                  {deleting === ev._id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Pagination page={page} pages={pages} onPageChange={setPage} />

      {attendeeEvent && (
        <AttendeeModal
          eventId={attendeeEvent.id}
          eventTitle={attendeeEvent.title}
          onClose={() => setAttendeeEvent(null)}
        />
      )}
    </main>
  );
}
