import { Response, NextFunction } from 'express';
import { z } from 'zod';
import TaskService from '../services/taskService';
import { AuthenticatedRequest } from '../types';
import ApiError from '../utils/ApiError';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(150),
  description: z.string().optional(),
  project: z.string().min(1, 'Project ID is required'),
  assignedTo: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().transform(str => new Date(str)).optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().transform(str => new Date(str)).optional(),
  tags: z.array(z.string()).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000),
});

export class TaskController {
  public static async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const parsed = createTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const task = await TaskService.createTask(parsed.data as any, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { project, status, priority, assignedTo } = req.query;

      const tasks = await TaskService.getTasks({
        project: project as string,
        status: status as any,
        priority: priority as any,
        assignedTo: assignedTo as string,
      });

      res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTaskById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskService.getTaskById(id);
      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = updateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const updatedTask = await TaskService.updateTask(id, parsed.data as any);
      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: updatedTask,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await TaskService.deleteTask(id);
      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');
      const { id } = req.params;

      const parsed = commentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const comment = await TaskService.addComment(id, req.user.id, parsed.data.content);
      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getComments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const comments = await TaskService.getTaskComments(id);
      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default TaskController;
