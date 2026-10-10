/**
 * Concurrency test — anti-overbooking verification
 *
 * Creates a fresh event with SEATS seats, registers ATTENDEES unique users,
 * fires all booking requests simultaneously, then asserts that exactly SEATS
 * bookings succeeded and availableSeats is 0.
 *
 * Usage (server must be running):
 *   node scripts/concurrency-test.js
 *   API_URL=http://localhost:5000/api node scripts/concurrency-test.js
 *
 * Safe to run against a dev database — all test users and the event are
 * labelled with a timestamp so they don't collide across runs.
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const BASE = process.env.API_URL || 'http://localhost:5000/api';
const ATTENDEES = 20;
const SEATS = 5;

// ---------------------------------------------------------------------------
// Minimal fetch wrapper
// ---------------------------------------------------------------------------

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeUser(label, role) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.dev`;
  const password = 'password123';

  const reg = await api('/auth/register', {
    method: 'POST',
    body: { name: label, email, password, role },
  });

  if (reg.status !== 201) {
    throw new Error(`Registration failed for ${label}: ${JSON.stringify(reg.data)}`);
  }

  const login = await api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (!login.data.token) {
    throw new Error(`Login failed for ${label}: ${JSON.stringify(login.data)}`);
  }

  return login.data.token;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log('── EventHub concurrency test ──────────────────────────────');
  console.log(`  Attendees : ${ATTENDEES}`);
  console.log(`  Seats     : ${SEATS}`);
  console.log(`  API       : ${BASE}`);
  console.log('───────────────────────────────────────────────────────────\n');

  // 1. Create organizer and event
  console.log('1. Creating organizer and event...');
  const organizerToken = await makeUser('org', 'organizer');

  const eventRes = await api('/events', {
    method: 'POST',
    token: organizerToken,
    body: {
      title: 'Concurrency test event',
      description: 'Seat race — automated test',
      category: 'Test',
      venue: 'Lab',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      price: 100,
      totalSeats: SEATS,
    },
  });

  // Response shape: { event: { _id, ... } }
  const eventId = eventRes.data?.event?._id;
  if (!eventId) {
    console.error('Failed to create event:', JSON.stringify(eventRes.data, null, 2));
    process.exit(1);
  }
  console.log(`   Event ID: ${eventId}\n`);

  // 2. Register all attendees in parallel
  console.log(`2. Registering ${ATTENDEES} attendees...`);
  const tokens = await Promise.all(
    Array.from({ length: ATTENDEES }, (_, i) => makeUser(`attendee${i}`, 'attendee'))
  );
  console.log(`   Done.\n`);

  // 3. Fire all bookings simultaneously
  console.log(`3. Firing ${ATTENDEES} simultaneous booking requests...`);
  const results = await Promise.all(
    tokens.map((token) =>
      api(`/events/${eventId}/book`, { method: 'POST', token, body: { seats: 1 } })
    )
  );

  // 4. Tally results
  const succeeded = results.filter((r) => r.status === 201);
  const soldOut   = results.filter((r) => r.status === 409);
  const other     = results.filter((r) => r.status !== 201 && r.status !== 409);

  console.log('\n── Results ─────────────────────────────────────────────────');
  console.log(`  201 Booked  : ${succeeded.length}`);
  console.log(`  409 Rejected: ${soldOut.length}`);
  if (other.length) {
    console.log(`  Other       : ${other.length}`);
    other.forEach((r) => console.log('    ', r.status, JSON.stringify(r.data)));
  }

  // 5. Verify availableSeats on the event
  const eventCheck = await api(`/events/${eventId}`);
  const availableSeats = eventCheck.data?.event?.availableSeats;
  console.log(`  availableSeats after test: ${availableSeats}`);
  console.log('───────────────────────────────────────────────────────────');

  // 6. Verdict
  const pass = succeeded.length === SEATS && availableSeats === 0;
  if (pass) {
    console.log('\n✓ PASS — exactly', SEATS, 'bookings succeeded, no overbooking.\n');
  } else {
    console.log('\n✗ FAIL');
    if (succeeded.length !== SEATS) {
      console.log(`  Expected ${SEATS} successful bookings, got ${succeeded.length}`);
    }
    if (availableSeats !== 0) {
      console.log(`  Expected availableSeats = 0, got ${availableSeats}`);
    }
    console.log();
    process.exit(1);
  }
})();
