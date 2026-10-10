import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import EventCard from '../components/EventCard';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';

const CATEGORIES = ['Music', 'Tech', 'Sports', 'Art', 'Food', 'Business', 'Other'];
const DEBOUNCE_MS = 400;

export default function Events() {
  const [events, setEvents]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [filters, setFilters] = useState({
    search: '', category: '', dateFrom: '', dateTo: '',
  });

  // Committed query — debounced on search, immediate on everything else
  const [query, setQuery] = useState({ search: '', category: '', dateFrom: '', dateTo: '' });
  const debounceRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 9, ...query };
      // Strip empty strings so they don't reach the server
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const { data } = await api.get('/events', { params });
      setEvents(data.events);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    const updated = { ...filters, [name]: value };
    setFilters(updated);

    if (name === 'search') {
      // Debounce the search field — commit after user stops typing
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPage(1);
        setQuery((prev) => ({ ...prev, search: value }));
      }, DEBOUNCE_MS);
    } else {
      // Category and date filters apply immediately
      setPage(1);
      setQuery((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleReset() {
    clearTimeout(debounceRef.current);
    const empty = { search: '', category: '', dateFrom: '', dateTo: '' };
    setFilters(empty);
    setQuery(empty);
    setPage(1);
  }

  // Clean up pending debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <main className="events-page">
      <h1>Upcoming Events <span className="events-page__count">({total})</span></h1>

      {/* ── Filters ── */}
      <div className="events-filters" role="search">
        <input
          type="search"
          name="search"
          placeholder="Search events…"
          value={filters.search}
          onChange={handleFilterChange}
          aria-label="Search events"
        />

        <select name="category" value={filters.category} onChange={handleFilterChange} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="events-filters__date">
          From
          <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} />
        </label>

        <label className="events-filters__date">
          To
          <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} />
        </label>

        <button type="button" className="btn btn--outline" onClick={handleReset}>Reset</button>
      </div>

      {/* ── Results ── */}
      {loading && <Loader />}
      <ErrorMessage message={error} />

      {!loading && !error && events.length === 0 && (
        <p className="events-page__empty">No events found. Try adjusting your filters.</p>
      )}

      <div className="event-grid">
        {events.map((ev) => <EventCard key={ev._id} event={ev} />)}
      </div>

      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </main>
  );
}
