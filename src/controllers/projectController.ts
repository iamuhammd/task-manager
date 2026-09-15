import { Response, NextFunction } from 'express';
import { z } from 'zod';
import ProjectService from '../services/projectService';
import { AuthenticatedRequest } from '../types';
import ApiError from '../utils/ApiError';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().optional(),
  members: z.array(z.string()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
  members: z.array(z.string()).optional(),
});

const addMemberSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
});

export class ProjectController {
  public static async createProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const project = await ProjectService.createProject(parsed.data, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProjects(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');

      const projects = await ProjectService.getAllProjects(req.user.id);
      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProjectById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const project = await ProjectService.getProjectById(id);
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');
      const { id } = req.params;

      const parsed = updateProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const project = await ProjectService.updateProject(id, req.user.id, parsed.data as any);
      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');
      const { id } = req.params;

      await ProjectService.deleteProject(id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new ApiError(401, 'Unauthorized');
      const { id } = req.params;

      const parsed = addMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const project = await ProjectService.addMember(id, req.user.id, parsed.data.memberId);
      res.status(200).json({
        success: true,
        message: 'Member added to project successfully',
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ProjectController;
