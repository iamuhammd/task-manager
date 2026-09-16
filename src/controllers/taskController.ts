import { Response, NextFunction } from 'express';
import { z } from 'zod';
import TaskService from '../services/taskService';
import ApiError from '../utils/ApiError';
import { AuthenticatedRequest, TaskStatus, TaskPriority } from '../types';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  projectId: z.string().min(1, 'projectId is required'),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  tags: z.array(z.string()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['todo', 'in-progress', 'review', 'done'], {
    required_error: 'status is required',
  }),
});

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000),
  mentions: z.array(z.string()).optional(),
});

// ─── Validation helper ────────────────────────────────────────────────────────

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(', ');
    throw ApiError.badRequest(message);
  }
  return result.data;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class TaskController {
  /**
   * POST /api/v1/tasks
   */
  static async createTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(createTaskSchema, req.body);
      const task = await TaskService.createTask(req.user.id, input);
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: { task },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tasks/project/:projectId
   */
  static async getProjectTasks(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const { projectId } = req.params;
      const filters = {
        status: req.query.status as TaskStatus | undefined,
        priority: req.query.priority as TaskPriority | undefined,
        assignedTo: req.query.assignedTo as string | undefined,
      };
      const tasks = await TaskService.getProjectTasks(projectId, req.user.id, filters);
      res.status(200).json({
        success: true,
        data: { tasks, count: tasks.length },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tasks/:id
   */
  static async getTaskById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const task = await TaskService.getTaskById(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: { task },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/tasks/:id
   */
  static async updateTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(updateTaskSchema, req.body);
      const task = await TaskService.updateTask(req.params.id, req.user.id, input);
      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: { task },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/status
   */
  static async updateTaskStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const { status } = validate(updateStatusSchema, req.body);
      const task = await TaskService.updateTaskStatus(req.params.id, req.user.id, status);
      res.status(200).json({
        success: true,
        message: `Task status updated to "${status}"`,
        data: { task },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id
   */
  static async deleteTask(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      await TaskService.deleteTask(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Task and its comments deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/tasks/:id/comments
   */
  static async addComment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(createCommentSchema, req.body);
      const comment = await TaskService.addComment(req.params.id, req.user.id, input);
      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: { comment },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tasks/:id/comments
   */
  static async getTaskComments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const comments = await TaskService.getTaskComments(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: { comments, count: comments.length },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id/comments/:commentId
   */
  static async deleteComment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      await TaskService.deleteComment(req.params.commentId, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export default TaskController;
