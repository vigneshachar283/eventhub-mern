const { z } = require('zod');

// ---------------------------------------------------------------------------
// Middleware factories
// ---------------------------------------------------------------------------

/**
 * Validates req.body against a Zod schema.
 * Replaces req.body with parsed data on success; responds 400 on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: {
          ...fieldErrors,
          ...(formErrors.length > 0 && { _form: formErrors }),
        },
      });
    }

    req.body = result.data;
    next();
  };
}

/**
 * Validates req.query against a Zod schema.
 * Writes parsed data to req.validatedQuery on success (leaves req.query
 * untouched so Express internals are unaffected); responds 400 on failure.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: {
          ...fieldErrors,
          ...(formErrors.length > 0 && { _form: formErrors }),
        },
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Must be a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(['organizer', 'attendee']).optional(),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Must be a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

// ---------------------------------------------------------------------------
// Event schemas
// ---------------------------------------------------------------------------

// .strict() turns unknown keys into a 400 rather than silently stripping them.
// This prevents clients from submitting availableSeats or organizer in the body.
const eventBodySchema = z
  .object({
    title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title is required'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description is required'),
    category: z
      .string({ required_error: 'Category is required' })
      .trim()
      .min(1, 'Category is required'),
    venue: z.string({ required_error: 'Venue is required' }).trim().min(1, 'Venue is required'),
    date: z
      .string({ required_error: 'Date is required' })
      .datetime({ message: 'Date must be a valid ISO 8601 datetime' }),
    price: z.number({ invalid_type_error: 'Price must be a number' }).min(0).optional(),
    totalSeats: z
      .number({
        required_error: 'totalSeats is required',
        invalid_type_error: 'totalSeats must be a number',
      })
      .int('totalSeats must be an integer')
      .min(1, 'totalSeats must be at least 1'),
  })
  .strict();

// All fields optional for PATCH; at least one must be present.
// .strict() still rejects availableSeats / organizer / any unknown key.
const eventUpdateSchema = eventBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

// Query-string schema for GET /api/events
// All fields come in as strings from the URL, so coerce where needed.
const eventQuerySchema = z
  .object({
    search:   z.string().trim().optional(),
    category: z.string().trim().optional(),
    dateFrom: z
      .string()
      .datetime({ offset: true, message: 'dateFrom must be a valid ISO 8601 datetime' })
      .optional(),
    dateTo: z
      .string()
      .datetime({ offset: true, message: 'dateTo must be a valid ISO 8601 datetime' })
      .optional(),
    page:  z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Booking schemas
// ---------------------------------------------------------------------------

const bookSeatsSchema = z
  .object({
    seats: z
      .number({
        required_error: 'seats is required',
        invalid_type_error: 'seats must be a number',
      })
      .int('seats must be a whole number')
      .min(1, 'seats must be at least 1')
      .max(10, 'seats cannot exceed 10 per booking'),
  })
  .strict();

module.exports = {
  validate,
  validateQuery,
  registerSchema,
  loginSchema,
  eventBodySchema,
  eventUpdateSchema,
  eventQuerySchema,
  bookSeatsSchema,
};
