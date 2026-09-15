import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import ApiError from '../utils/ApiError';
import { AuthenticatedRequest, IUserPayload } from '../types';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Authentication token missing');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as IUserPayload;
    req.user = decoded;

    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      next(error);
    } else if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid authentication token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Authentication token expired'));
    } else {
      next(new ApiError(401, 'Authentication failed'));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: You do not have permission to access this resource'));
    }

    next();
  };
};

export default authenticate;
