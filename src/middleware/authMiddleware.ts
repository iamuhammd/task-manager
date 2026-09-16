import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import ApiError from '../utils/ApiError';
import { AuthenticatedRequest, JwtPayload, Role } from '../types';

/**
 * authenticate — Verify a JWT from the Authorization: Bearer <token> header.
 *
 * On success, attaches the decoded payload to `req.user`.
 * On failure, forwards an ApiError with an appropriate status code:
 *   - 401 if token is missing, invalid, or expired
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Authentication token is missing');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Authentication token has expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Authentication token is invalid'));
    } else {
      next(ApiError.unauthorized('Authentication failed'));
    }
  }
};

/**
 * authorize — Role-based access control guard.
 *
 * Must be used *after* `authenticate`.
 * Accepts one or more roles; the request is allowed if `req.user.role`
 * is included in the list.
 *
 * @example
 *   router.delete('/:id', authenticate, authorize('admin'), handler)
 */
export const authorize = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('User is not authenticated'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role as Role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

export default authenticate;
