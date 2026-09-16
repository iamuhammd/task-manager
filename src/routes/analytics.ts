import { Router } from 'express';
import AnalyticsController from '../controllers/analyticsController';
import authenticate, { authorize } from '../middleware/authMiddleware';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Usage statistics and productivity analytics
 */

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics for the authenticated user
 *     description: Returns aggregate statistics across all projects and tasks the user is part of — total counts, breakdown by status and priority, and overall completion rate.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalProjects: 5
 *                 totalTasks: 42
 *                 tasksByStatus:
 *                   todo: 10
 *                   in-progress: 15
 *                   review: 7
 *                   done: 10
 *                 tasksByPriority:
 *                   low: 5
 *                   medium: 20
 *                   high: 12
 *                   urgent: 5
 *                 completionRate: 24
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', AnalyticsController.getDashboard);

/**
 * @swagger
 * /analytics/projects/{id}:
 *   get:
 *     summary: Get task statistics for a specific project
 *     description: Returns total tasks, completed, in-progress, overdue (past dueDate and not done), member count, and completion rate. Caller must be a project member.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project task statistics
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalTasks: 20
 *                 completed: 8
 *                 inProgress: 5
 *                 overdue: 3
 *                 memberCount: 4
 *                 completionRate: 40
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Project not found
 */
router.get('/projects/:id', AnalyticsController.getProjectStats);

/**
 * @swagger
 * /analytics/users/{id}/productivity:
 *   get:
 *     summary: Get productivity stats for a specific user (admin or manager only)
 *     description: Returns total tasks assigned, tasks completed on time, overall completion rate, and average number of days to complete a task.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user's ID
 *     responses:
 *       200:
 *         description: User productivity statistics
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalAssigned: 15
 *                 completedOnTime: 11
 *                 completionRate: 73
 *                 averageCompletionDays: 3.4
 *       403:
 *         description: Admin or manager access required
 *       404:
 *         description: User not found
 */
router.get(
  '/users/:id/productivity',
  authorize('admin', 'manager'),
  AnalyticsController.getUserProductivity
);

export default router;
