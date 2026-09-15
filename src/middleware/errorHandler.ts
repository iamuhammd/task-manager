import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { NODE_ENV } from '../config/env';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  let stack = err.stack;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err instanceof Error) {
    message = err.message;
  }

  logger.error(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`, {
    stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  const response = {
    success: false,
    statusCode,
    message: isOperational || NODE_ENV === 'development' ? message : 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack }),
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
