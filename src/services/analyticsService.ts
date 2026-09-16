import mongoose from 'mongoose';
import Project from '../models/Project';
import Task from '../models/Task';

// ─── Dashboard Analytics ──────────────────────────────────────────────────────

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completionRate: number;
}

export interface ProjectStats {
  totalTasks: number;
  completed: number;
  inProgress: number;
  overdue: number;
  memberCount: number;
  completionRate: number;
}

export interface UserProductivity {
  totalAssigned: number;
  completedOnTime: number;
  completionRate: number;
  averageCompletionDays: number | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AnalyticsService {
  /**
   * Dashboard stats for the authenticated user:
   * projects they own or belong to, tasks across those projects.
   */
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    const objectId = new mongoose.Types.ObjectId(userId);

    // All projects the user is part of
    const userProjects = await Project.find({
      $or: [{ owner: objectId }, { 'members.user': objectId }],
    }).distinct('_id');

    const totalProjects = userProjects.length;

    // Aggregate tasks across those projects
    const taskAgg = await Task.aggregate([
      { $match: { project: { $in: userProjects } } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        },
      },
    ]);

    const agg = taskAgg[0];
    const totalTasks: number = agg.total[0]?.count ?? 0;

    const tasksByStatus: Record<string, number> = {};
    for (const s of agg.byStatus) tasksByStatus[s._id] = s.count;

    const tasksByPriority: Record<string, number> = {};
    for (const p of agg.byPriority) tasksByPriority[p._id] = p.count;

    const done = tasksByStatus['done'] ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0;

    return { totalProjects, totalTasks, tasksByStatus, tasksByPriority, completionRate };
  }

  /**
   * Task statistics for a specific project.
   */
  static async getProjectStats(projectId: string): Promise<ProjectStats> {
    const objectId = new mongoose.Types.ObjectId(projectId);
    const now = new Date();

    const project = await Project.findById(objectId).select('members');
    const memberCount = project ? project.members.length : 0;

    const agg = await Task.aggregate([
      { $match: { project: objectId } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          completed: [{ $match: { status: 'done' } }, { $count: 'count' }],
          inProgress: [{ $match: { status: 'in-progress' } }, { $count: 'count' }],
          overdue: [
            {
              $match: {
                dueDate: { $lt: now },
                status: { $ne: 'done' },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const a = agg[0];
    const totalTasks: number = a.total[0]?.count ?? 0;
    const completed: number = a.completed[0]?.count ?? 0;
    const inProgress: number = a.inProgress[0]?.count ?? 0;
    const overdue: number = a.overdue[0]?.count ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return { totalTasks, completed, inProgress, overdue, memberCount, completionRate };
  }

  /**
   * Productivity stats for a specific user (admin/manager view).
   */
  static async getUserProductivity(targetUserId: string): Promise<UserProductivity> {
    const objectId = new mongoose.Types.ObjectId(targetUserId);
    const now = new Date();

    const agg = await Task.aggregate([
      { $match: { assignedTo: objectId } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          completedOnTime: [
            {
              $match: {
                status: 'done',
                $or: [
                  { dueDate: { $exists: false } },
                  { $expr: { $lte: ['$updatedAt', '$dueDate'] } },
                ],
              },
            },
            { $count: 'count' },
          ],
          avgCompletion: [
            {
              $match: {
                status: 'done',
                dueDate: { $exists: true },
              },
            },
            {
              $project: {
                diffDays: {
                  $divide: [
                    { $subtract: ['$updatedAt', '$createdAt'] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
            },
            { $group: { _id: null, avg: { $avg: '$diffDays' } } },
          ],
        },
      },
    ]);

    const a = agg[0];
    const totalAssigned: number = a.total[0]?.count ?? 0;
    const completedOnTime: number = a.completedOnTime[0]?.count ?? 0;
    const completionRate =
      totalAssigned > 0 ? Math.round((completedOnTime / totalAssigned) * 100) : 0;
    const averageCompletionDays: number | null =
      a.avgCompletion[0]?.avg != null
        ? Math.round(a.avgCompletion[0].avg * 10) / 10
        : null;

    return { totalAssigned, completedOnTime, completionRate, averageCompletionDays };
  }
}

export default AnalyticsService;
