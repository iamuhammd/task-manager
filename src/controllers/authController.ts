import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AuthService from '../services/authService';
import ApiError from '../utils/ApiError';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['user', 'admin']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
        throw new ApiError(400, errorMsg);
      }

      const result = await AuthService.register(parsed.data);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
        throw new ApiError(400, errorMsg);
      }

      const result = await AuthService.login(parsed.data.email, parsed.data.password);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = refreshTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.errors.map(e => e.message).join(', ');
        throw new ApiError(400, errorMsg);
      }

      const result = await AuthService.refreshAccessToken(parsed.data.refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
