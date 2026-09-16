import { Request } from 'express';
import { Document, Types } from 'mongoose';

// ─── User Roles ──────────────────────────────────────────────────────────────
export type Role = 'admin' | 'manager' | 'user';

// ─── Task Types ───────────────────────────────────────────────────────────────
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ─── Project Member Roles ─────────────────────────────────────────────────────
export type ProjectMemberRole = 'admin' | 'manager' | 'member';

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

// ─── Project Interfaces ───────────────────────────────────────────────────────

export interface IProjectMember {
  user: Types.ObjectId;
  role: ProjectMemberRole;
  joinedAt: Date;
}

/**
 * Plain project data shape (mirrors Mongoose schema fields).
 */
export interface IProject {
  name: string;
  description?: string;
  owner: Types.ObjectId;
  members: IProjectMember[];
  categories: string[];
  tags: string[];
  status: 'active' | 'archived';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose document that extends IProject.
 */
export interface IProjectDocument extends IProject, Document {}

export interface CreateProjectInput {
  name: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  dueDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  dueDate?: string;
  status?: 'active' | 'archived';
}

export interface AddMemberInput {
  userId: string;
  role?: ProjectMemberRole;
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
