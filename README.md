# EventHub

A full-stack event management platform built with the MERN stack. Organizers can create and manage events; attendees can browse, search, filter, and book seats with real-time overbooking protection.

---

## Features

- **Role-based auth** — JWT with HS256, separate organizer and attendee flows
- **Event management** — create, edit, delete events with full-text search, category and date filters, and pagination
- **Atomic seat booking** — MongoDB multi-document transactions prevent overselling even under concurrent load
- **Double-booking prevention** — partial unique index on `{ user, event }` blocks duplicate confirmed bookings
- **Booking cancellation** — seats are atomically restored; cancellation is transactional
- **Organizer dashboard** — seat counts, attendee list per event, edit and delete
- **Concurrency verified** — custom script fires 20 simultaneous bookings for 5 seats and asserts exactly 5 succeed (0 oversold every run)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Axios |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas (replica set — required for transactions) |
| ODM | Mongoose 9 |
| Validation | Zod 4 (body + query schemas, `.strict()`) |
| Auth | bcryptjs, jsonwebtoken (HS256, 7-day expiry) |
| Build tool | Vite 8 |

---

## Setup

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (replica set, for transactions)

### Server

```bash
cd server
cp .env.example .env
```

Fill in `.env`:
```
PORT=5000
MONGO_URI=<your Atlas connection string>
JWT_SECRET=<a long random secret>
```

```bash
npm install
npm run dev
```

The server exits immediately on startup if `JWT_SECRET` is not set.

### Client

```bash
cd client
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## How to Run

Start both in separate terminals:

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

### Concurrency test (optional)

With the server running:
```bash
cd server
node scripts/concurrency-test.js
```

Expected output:
```
✓ PASS — exactly 5 bookings succeeded, no overbooking.
```

---

## API Reference

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /api/auth/register | — | — |
| POST | /api/auth/login | — | — |
| GET | /api/auth/me | ✓ | any |
| GET | /api/events | — | — |
| GET | /api/events/mine | ✓ | organizer |
| GET | /api/events/:id | — | — |
| GET | /api/events/:id/bookings | ✓ | organizer (owner) |
| POST | /api/events | ✓ | organizer |
| PATCH | /api/events/:id | ✓ | organizer (owner) |
| DELETE | /api/events/:id | ✓ | organizer (owner) |
| POST | /api/events/:id/book | ✓ | attendee |
| GET | /api/bookings/mine | ✓ | any |
| PATCH | /api/bookings/:id/cancel | ✓ | owner |

---

## Architecture Decisions

**Transactions over manual rollback** — `bookSeats` and `cancelBooking` use `session.withTransaction()`. A crash between the seat decrement and the booking write would silently leak seats in a two-step approach; a transaction rolls both back atomically.

**Optimistic locking on event updates** — `updateEvent` uses `findOneAndUpdate` with `$inc` (not read → mutate → save). If a booking arrives between the read and write, the filter's `totalSeats` check detects the conflict and returns a 409 "please retry" instead of silently overwriting the decrement.

**`availableSeats` denormalised on Event** — avoids a `Booking.countDocuments` aggregation on every list request. All mutations go through the service layer using `$inc` to keep the count accurate.

**Zod `.strict()` on event schemas** — `availableSeats` and `organizer` cannot be submitted by clients; unknown keys return 400 rather than being silently stripped.

**JWT algorithm pinned to HS256** — prevents algorithm-switching attacks (`alg: none`).

---

## Policy Decisions

| Decision | Current behaviour |
|----------|------------------|
| Cancel after event starts | Allowed — no date check in `cancelBooking`. Planned enhancement. |
| Organizer books own event | Blocked — `restrictTo('attendee')` on the book route. |
| Delete event with bookings | Blocked with 409 — protects attendee records. |
| Re-book after cancellation | Allowed — partial unique index only covers `status: confirmed`. |
| Null event in booking list | Handled in UI — shows "Event no longer available". |

---

## AI Development Experience

This project was built using **Kiro**, an AI-powered development environment.

### 1. Atomic booking with MongoDB transactions
The initial booking implementation used a two-step decrement-then-create with a manual rollback on failure. Kiro identified the seat-leak window (process crash between steps) and proposed replacing it with `session.withTransaction()`. This required restructuring `Booking.create` to accept an array with a session object — a Mongoose-specific API difference Kiro caught and corrected.

### 2. Race condition in event seat updates
The first `updateEvent` implementation used `Object.assign + event.save()`, which has a read-modify-write race: a booking arriving between the read and the save would have its decrement silently overwritten. Kiro redesigned this to use `findOneAndUpdate` with `$inc` and an optimistic lock on `totalSeats`, so concurrent booking decrements are preserved.

### 3. Zod validation for query strings
Kiro introduced a separate `validateQuery` middleware (writing to `req.validatedQuery` rather than overwriting Express's `req.query`) and built `eventQuerySchema` with `z.coerce.number()` for `page`/`limit` and `offset: true` on datetime fields to accept timezone-offset ISO strings from real-world clients.

### 4. Concurrency test script
Kiro wrote `scripts/concurrency-test.js` — 20 attendees, 5 seats, all requests fired simultaneously with `Promise.all`. The script distinguishes 201 (booked) from 409 (rejected), verifies `availableSeats === 0` after the run, and exits with a non-zero code on failure. Verified PASS on Atlas.

### 5. Schema hardening
Kiro audited the Booking model and added: an integer validator on `seats`, a `totalPrice` snapshot field (so old bookings show the correct price after an organizer edits the event price), and a partial unique index on `{ user, event }` filtered to `status: confirmed` — which prevents double-booking while allowing re-booking after cancellation.
