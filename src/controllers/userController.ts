import { Response, NextFunction } from 'express';
import { z } from 'zod';
import UserService from '../services/userService';
import ApiError from '../utils/ApiError';
import { AuthenticatedRequest } from '../types';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(50).optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(50).optional(),
  avatar: z.string().url('Avatar must be a valid URL').or(z.literal('')).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
});

// ─── Validation helper ────────────────────────────────────────────────────────

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw ApiError.badRequest(result.error.errors.map((e) => e.message).join(', '));
  }
  return result.data;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class UserController {
  /**
   * GET /api/v1/users/profile
   */
  static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const user = await UserService.getProfile(req.user.id);
      res.status(200).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/users/profile
   */
  static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(updateProfileSchema, req.body);
      const user = await UserService.updateProfile(req.user.id, input);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/users/change-password
   */
  static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const { currentPassword, newPassword } = validate(changePasswordSchema, req.body);
      await UserService.changePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/users  (admin only)
   */
  static async getAllUsers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await UserService.getAllUsers(page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/users/:id  (admin or manager)
   */
  static async getUserById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.getUserById(req.params.id);
      res.status(200).json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/users/:id/deactivate  (admin only)
   */
  static async deactivateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const user = await UserService.deactivateUser(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/users/:id  (admin only)
   */
  static async deleteUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      await UserService.deleteUser(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'User and all associated data deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export default UserController;
