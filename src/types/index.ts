import { Request } from 'express';
import { Document, Types } from 'mongoose';

// ─── User Roles ───────────────────────────────────────────────────────────────
export type Role = 'admin' | 'manager' | 'user';

// ─── Task Enums ───────────────────────────────────────────────────────────────
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// ─── Project Member Roles ─────────────────────────────────────────────────────
export type ProjectMemberRole = 'admin' | 'manager' | 'member';

// ─── User Interfaces ──────────────────────────────────────────────────────────

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

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Project Interfaces ───────────────────────────────────────────────────────

export interface IProjectMember {
  user: Types.ObjectId;
  role: ProjectMemberRole;
  joinedAt: Date;
}

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

// ─── Task Interfaces ──────────────────────────────────────────────────────────

export interface IAttachment {
  filename: string;
  url: string;
  uploadedAt: Date;
}

export interface IActivityLogEntry {
  user: Types.ObjectId;
  action: string;
  timestamp: Date;
}

export interface ITask {
  title: string;
  description?: string;
  project: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  createdBy: Types.ObjectId;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  tags: string[];
  attachments: IAttachment[];
  activityLog: IActivityLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document {}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: string;
  assignedTo?: string;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignedTo?: string;
  priority?: TaskPriority;
  dueDate?: string;
  tags?: string[];
}

export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
}

// ─── Comment Interfaces ───────────────────────────────────────────────────────

export interface IComment {
  task: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  mentions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentDocument extends IComment, Document {}

export interface CreateCommentInput {
  content: string;
  mentions?: string[];
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
