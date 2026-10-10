# EventHub MERN

A full-stack event management platform built with MongoDB, Express, React, and Node.js.

---

## Features

- JWT authentication with role-based access (organizer / attendee)
- Event creation, listing (full-text search, filters, pagination), and management
- Seat booking with overbooking protection
- Booking cancellation with automatic seat restoration

## Tech Stack

- **Backend**: Node.js, Express 5, Mongoose, Zod, bcryptjs, jsonwebtoken
- **Database**: MongoDB Atlas (replica set — required for transactions)
- **Frontend**: React (in progress)

---

## Setup

```bash
cd server
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev
```

JWT_SECRET must be set — the server exits immediately on startup if it is missing.

---

## API Overview

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /api/auth/register | — | — |
| POST | /api/auth/login | — | — |
| GET | /api/auth/me | ✓ | any |
| GET | /api/events | — | — |
| GET | /api/events/mine | ✓ | organizer |
| GET | /api/events/:id | — | — |
| POST | /api/events | ✓ | organizer |
| PATCH | /api/events/:id | ✓ | organizer (owner only) |
| DELETE | /api/events/:id | ✓ | organizer (owner only) |
| POST | /api/events/:id/book | ✓ | attendee |
| GET | /api/bookings/mine | ✓ | any |
| PATCH | /api/bookings/:id/cancel | ✓ | any (owner only) |

---

## Architecture Notes

### JWT algorithm
All tokens are signed and verified with HS256 explicitly. This prevents
algorithm-switching attacks (e.g. `alg: none`).

### Event seat counts
`availableSeats` is never accepted from the client. It is set by the schema
default on creation and modified only by atomic `$inc` operations in the
booking and event-update services. The event-update path uses optimistic
locking (the filter includes the last-known `totalSeats`) so concurrent
bookings cannot be overwritten.

### Booking transactions
`bookSeats` and `cancelBooking` run inside MongoDB multi-document transactions
(requires Atlas or a replica set). This closes the seat-leak window that would
exist in a two-step approach: if the process crashed between decrementing
`availableSeats` and writing the booking document, seats would be lost forever.
With a transaction both writes commit or roll back together.

The pre-transaction approach (decrement → create → rollback on failure) is
documented in git history as a deliberate tradeoff for environments that
cannot use transactions.

### Double-booking prevention
A partial unique index on `{ user, event }` where `status: 'confirmed'`
prevents two confirmed bookings for the same event. A cancelled booking does
not block a re-book. A fast `Booking.exists` check before the transaction
returns a clean 409 on a double-click without touching the seat count.

### Event deletion
An event with confirmed bookings cannot be deleted (409). This protects
attendees from silently losing their booking records. The richer alternative
— an event `status` field (active | cancelled) that bulk-cancels bookings —
is a planned enhancement.

---

## Policy Decisions

### Can an attendee cancel after an event has started?
**Current behaviour: yes.** There is no check against `event.date` in
`cancelBooking`. The seats are returned to the pool, which is harmless for a
past event but looks odd in the data.
**Planned change:** add `event.date > new Date()` to the cancellation guard
once the UI is in place and a policy is agreed.

### Can an organizer book their own event?
**No.** `restrictTo('attendee')` on `POST /api/events/:id/book` blocks any
user with role `organizer`. This is intentional.

### What if an event is deleted after a booking is made?
Deletion is blocked while confirmed bookings exist, so this case cannot arise
for confirmed bookings. Cancelled bookings are left as-is after deletion.
`getMyBookings` populates `event` — if the event no longer exists the field
will be `null`. The React UI should handle this gracefully (e.g. show
"Event no longer available").

### Why is `availableSeats` stored on the Event document?
It avoids an aggregation query on every event listing. The tradeoff is that
it must be kept in sync with the bookings collection. All mutations go through
the service layer, which uses `$inc` to keep the two consistent.
