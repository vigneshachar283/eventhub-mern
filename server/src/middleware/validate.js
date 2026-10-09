const { z } = require('zod');

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns an Express middleware that validates req.body against the given Zod
 * schema. On failure it responds with 400 and a structured error payload.
 *
 * @param {import('zod').ZodTypeAny} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();

      return res.status(400).json({
        message: 'Validation failed',
        errors: {
          // Per-field messages as arrays of strings
          ...fieldErrors,
          // Top-level (non-field) errors, if any
          ...(formErrors.length > 0 && { _form: formErrors }),
        },
      });
    }

    // Replace req.body with the parsed (and possibly coerced) data
    req.body = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// Schemas
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

module.exports = { validate, registerSchema, loginSchema };
