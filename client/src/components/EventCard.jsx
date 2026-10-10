import { Link } from 'react-router-dom';

export default function EventCard({ event }) {
  const { _id, title, category, venue, date, price, availableSeats } = event;

  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const soldOut = availableSeats === 0;

  return (
    <article className={`event-card${soldOut ? ' event-card--sold-out' : ''}`}>
      <div className="event-card__meta">
        <span className="event-card__category">{category}</span>
        {soldOut && <span className="event-card__badge">Sold out</span>}
      </div>

      <h3 className="event-card__title">
        <Link to={`/events/${_id}`}>{title}</Link>
      </h3>

      <p className="event-card__detail">📍 {venue}</p>
      <p className="event-card__detail">📅 {formattedDate}</p>
      <p className="event-card__detail">
        {price === 0 ? 'Free' : `$${price}`}
        {' · '}
        {availableSeats} seat{availableSeats !== 1 ? 's' : ''} left
      </p>

      <Link to={`/events/${_id}`} className="btn btn--primary event-card__cta">
        View details
      </Link>
    </article>
  );
}
