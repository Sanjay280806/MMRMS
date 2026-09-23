import { HttpError } from './error.js';

export function validate(zodSchema) {
  return (req, _res, next) => {
    try {
      req.body = zodSchema.parse(req.body);
      next();
    } catch (err) {
      next(new HttpError(400, 'Validation failed', { issues: err.issues ?? err.errors }, 'VALIDATION_ERROR'));
    }
  };
}
