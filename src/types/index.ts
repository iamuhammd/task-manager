import { Request } from 'express';
import { Document } from 'mongoose';

// ─── User Roles ──────────────────────────────────────────────────────────────
export type Role = 'admin' | 'manager' | 'user';

// ─── Task Types ───────────────────────────────────────────────────────────────
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ─── User Interfaces ──────────────────────────────────────────────────────────

/**
 * Plain user data shape (mirrors Mongoose schema fields).
 */
export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: Role;
  avatar?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose document that extends IUser with instance methods.
 */
export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

// ─── Auth Input / Output ──────────────────────────────────────────────────────

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Express Request Extension ────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Generic API Response ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
