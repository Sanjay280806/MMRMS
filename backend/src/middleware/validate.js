import { HttpError } from './error.js';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On failure returns 400 with Zod's issue details.
 * On success replaces req.body with the parsed (coerced + stripped) output.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new HttpError(400, 'Validation failed', {
          issues: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        }),
      );
    }
    req.body = result.data;
    next();
  };
}
