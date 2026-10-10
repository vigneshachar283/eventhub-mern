import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';

const CATEGORIES = ['Music', 'Tech', 'Sports', 'Art', 'Food', 'Business', 'Other'];

const EMPTY_FORM = {
  title: '', description: '', category: '', venue: '',
  date: '', price: 0, totalSeats: 1,
};

// Convert a Date to the value expected by <input type="datetime-local">
function toDatetimeLocal(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  // datetime-local needs "YYYY-MM-DDTHH:MM"
  return d.toISOString().slice(0, 16);
}

export default function EventForm() {
  const { id } = useParams(); // defined on edit route
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm]       = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  // Load existing event for edit
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/events/${id}`)
      .then(({ data }) => {
        const ev = data.event;
        setForm({
          title:       ev.title,
          description: ev.description,
          category:    ev.category,
          venue:       ev.venue,
          date:        toDatetimeLocal(ev.date),
          price:       ev.price,
          totalSeats:  ev.totalSeats,
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Convert datetime-local string to full ISO string for the server
      const payload = { ...form, date: new Date(form.date).toISOString() };
      if (isEdit) {
        await api.patch(`/events/${id}`, payload);
      } else {
        await api.post('/events', payload);
      }
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const firstField = data?.errors && Object.values(data.errors)[0]?.[0];
      setError(firstField || data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader fullPage />;

  return (
    <main className="form-page">
      <h1>{isEdit ? 'Edit event' : 'Create event'}</h1>
      <ErrorMessage message={error} />

      <form className="event-form" onSubmit={handleSubmit} noValidate>
        <label>
          Title *
          <input type="text" name="title" value={form.title} onChange={handleChange} required />
        </label>

        <label>
          Description *
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} required />
        </label>

        <label>
          Category *
          <select name="category" value={form.category} onChange={handleChange} required>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label>
          Venue *
          <input type="text" name="venue" value={form.venue} onChange={handleChange} required />
        </label>

        <label>
          Date & time *
          <input type="datetime-local" name="date" value={form.date} onChange={handleChange} required />
        </label>

        <label>
          Price ($)
          <input type="number" name="price" value={form.price} onChange={handleChange} min={0} step={0.01} />
        </label>

        <label>
          Total seats *
          <input type="number" name="totalSeats" value={form.totalSeats} onChange={handleChange} min={1} required />
        </label>

        <div className="event-form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
          <button type="button" className="btn btn--outline" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
