import { Response, NextFunction } from 'express';
import { z } from 'zod';
import ProjectService from '../services/projectService';
import ApiError from '../utils/ApiError';
import { AuthenticatedRequest } from '../types';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  role: z.enum(['admin', 'manager', 'member']).optional(),
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

export class ProjectController {
  /**
   * POST /api/v1/projects
   */
  static async createProject(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(createProjectSchema, req.body);
      const project = await ProjectService.createProject(req.user.id, input);
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects
   */
  static async getAllProjects(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const projects = await ProjectService.getAllProjects(req.user.id);
      res.status(200).json({
        success: true,
        data: { projects, count: projects.length },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id
   */
  static async getProjectById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const project = await ProjectService.getProjectById(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/projects/:id
   */
  static async updateProject(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(updateProjectSchema, req.body);
      const project = await ProjectService.updateProject(req.params.id, req.user.id, input);
      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id
   */
  static async deleteProject(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      await ProjectService.deleteProject(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Project and all associated tasks deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/projects/:id/archive
   */
  static async archiveProject(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const project = await ProjectService.archiveProject(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Project archived successfully',
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/projects/:id/restore
   */
  static async restoreProject(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const project = await ProjectService.restoreProject(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Project restored successfully',
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/members
   */
  static async addMember(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const input = validate(addMemberSchema, req.body);
      const project = await ProjectService.addMember(req.params.id, req.user.id, input);
      res.status(200).json({
        success: true,
        message: 'Member added to project successfully',
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id/members/:memberId
   */
  static async removeMember(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const project = await ProjectService.removeMember(
        req.params.id,
        req.user.id,
        req.params.memberId
      );
      res.status(200).json({
        success: true,
        message: 'Member removed from project successfully',
        data: { project },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default ProjectController;
