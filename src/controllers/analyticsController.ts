import { Response, NextFunction } from 'express';
import AnalyticsService from '../services/analyticsService';
import ProjectService from '../services/projectService';
import ApiError from '../utils/ApiError';
import { AuthenticatedRequest } from '../types';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard
   */
  static async getDashboard(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const stats = await AnalyticsService.getDashboardStats(req.user.id);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/projects/:id
   */
  static async getProjectStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      // Verify membership via projectService (throws 403/404 if not a member)
      await ProjectService.getProjectById(req.params.id, req.user.id);
      const stats = await AnalyticsService.getProjectStats(req.params.id);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/analytics/users/:id/productivity
   */
  static async getUserProductivity(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await AnalyticsService.getUserProductivity(req.params.id);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}

export default AnalyticsController;
