import mongoose from 'mongoose';
import Task from '../models/Task';
import Comment from '../models/Comment';
import Project from '../models/Project';
import ApiError from '../utils/ApiError';
import {
  ITaskDocument,
  ICommentDocument,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterOptions,
  CreateCommentInput,
  TaskStatus,
} from '../types';

// ─── Populate options ─────────────────────────────────────────────────────────

const TASK_POPULATE = [
  { path: 'assignedTo', select: 'firstName lastName email avatar' },
  { path: 'createdBy', select: 'firstName lastName email avatar' },
  { path: 'project', select: 'name status' },
  { path: 'activityLog.user', select: 'firstName lastName email' },
];

const COMMENT_POPULATE = [
  { path: 'author', select: 'firstName lastName email avatar' },
  { path: 'mentions', select: 'firstName lastName email' },
];

// ─── Helper: verify project membership ───────────────────────────────────────

async function assertProjectMember(projectId: string, userId: string): Promise<void> {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const isOwner = project.owner.toString() === userId;
  const isMember = project.members.some((m) => m.user.toString() === userId);
  if (!isOwner && !isMember) {
    throw ApiError.forbidden('You are not a member of this project');
  }
}

// ─── Helper: log activity ─────────────────────────────────────────────────────

function buildLogEntry(userId: string, action: string) {
  return {
    user: new mongoose.Types.ObjectId(userId),
    action,
    timestamp: new Date(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class TaskService {
  /**
   * Create a task inside a project. Caller must be a project member.
   * Logs 'Task created' as the first activity entry.
   */
  static async createTask(
    userId: string,
    input: CreateTaskInput
  ): Promise<ITaskDocument> {
    await assertProjectMember(input.projectId, userId);

    const task = await Task.create({
      title: input.title,
      description: input.description,
      project: input.projectId,
      assignedTo: input.assignedTo || undefined,
      createdBy: userId,
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      tags: input.tags ?? [],
      activityLog: [buildLogEntry(userId, 'Task created')],
    });

    return task.populate(TASK_POPULATE);
  }

  /**
   * Get all tasks for a project, with optional filters.
   * Caller must be a project member.
   */
  static async getProjectTasks(
    projectId: string,
    userId: string,
    filters: TaskFilterOptions
  ): Promise<ITaskDocument[]> {
    await assertProjectMember(projectId, userId);

    const query: Record<string, unknown> = { project: projectId };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = new mongoose.Types.ObjectId(filters.assignedTo);

    return Task.find(query).populate(TASK_POPULATE).sort({ createdAt: -1 });
  }

  /**
   * Get a single task by ID. Caller must be a project member.
   */
  static async getTaskById(taskId: string, userId: string): Promise<ITaskDocument> {
    const task = await Task.findById(taskId).populate(TASK_POPULATE);
    if (!task) throw ApiError.notFound('Task not found');

    await assertProjectMember(task.project.toString(), userId);
    return task;
  }

  /**
   * Update task fields. Caller must be a project member.
   * Adds an activity log entry for each field that changed.
   */
  static async updateTask(
    taskId: string,
    userId: string,
    input: UpdateTaskInput
  ): Promise<ITaskDocument> {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    await assertProjectMember(task.project.toString(), userId);

    const updateData: Partial<ITaskDocument> = {};
    const logEntries: { user: mongoose.Types.ObjectId; action: string; timestamp: Date }[] = [];

    if (input.title !== undefined && input.title !== task.title) {
      updateData.title = input.title;
      logEntries.push(buildLogEntry(userId, `Title updated to "${input.title}"`));
    }
    if (input.description !== undefined && input.description !== task.description) {
      updateData.description = input.description;
      logEntries.push(buildLogEntry(userId, 'Description updated'));
    }
    if (input.priority !== undefined && input.priority !== task.priority) {
      updateData.priority = input.priority;
      logEntries.push(buildLogEntry(userId, `Priority changed to ${input.priority}`));
    }
    if (input.dueDate !== undefined) {
      updateData.dueDate = new Date(input.dueDate);
      logEntries.push(buildLogEntry(userId, `Due date set to ${input.dueDate}`));
    }
    if (input.tags !== undefined) {
      updateData.tags = input.tags;
      logEntries.push(buildLogEntry(userId, 'Tags updated'));
    }
    if (input.assignedTo !== undefined) {
      updateData.assignedTo = input.assignedTo
        ? new mongoose.Types.ObjectId(input.assignedTo)
        : undefined;
      logEntries.push(buildLogEntry(userId, 'Assignee updated'));
    }

    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        ...updateData,
        $push: { activityLog: { $each: logEntries } },
      },
      { new: true, runValidators: true }
    ).populate(TASK_POPULATE);

    return updated!;
  }

  /**
   * Update only the task status. Caller must be a project member or the assignee.
   */
  static async updateTaskStatus(
    taskId: string,
    userId: string,
    status: TaskStatus
  ): Promise<ITaskDocument> {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    // Allow project member OR the assignee
    const isAssignee = task.assignedTo?.toString() === userId;
    if (!isAssignee) {
      await assertProjectMember(task.project.toString(), userId);
    }

    const updated = await Task.findByIdAndUpdate(
      taskId,
      {
        status,
        $push: {
          activityLog: buildLogEntry(userId, `Status changed to ${status}`),
        },
      },
      { new: true, runValidators: true }
    ).populate(TASK_POPULATE);

    return updated!;
  }

  /**
   * Delete a task and all its comments.
   * Caller must be the project owner or the task creator.
   */
  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    const project = await Project.findById(task.project);
    if (!project) throw ApiError.notFound('Project not found');

    const isProjectOwner = project.owner.toString() === userId;
    const isTaskCreator = task.createdBy.toString() === userId;

    if (!isProjectOwner && !isTaskCreator) {
      throw ApiError.forbidden(
        'Only the project owner or the task creator can delete this task'
      );
    }

    await Comment.deleteMany({ task: taskId });
    await Task.findByIdAndDelete(taskId);
  }

  /**
   * Add a comment to a task. Caller must be a project member.
   * Logs 'Comment added' to the task's activity log.
   */
  static async addComment(
    taskId: string,
    userId: string,
    input: CreateCommentInput
  ): Promise<ICommentDocument> {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    await assertProjectMember(task.project.toString(), userId);

    const comment = await Comment.create({
      task: taskId,
      author: userId,
      content: input.content,
      mentions: input.mentions?.map((id) => new mongoose.Types.ObjectId(id)) ?? [],
    });

    // Log comment activity on the task
    await Task.findByIdAndUpdate(taskId, {
      $push: { activityLog: buildLogEntry(userId, 'Comment added') },
    });

    return comment.populate(COMMENT_POPULATE);
  }

  /**
   * Get all comments for a task. Caller must be a project member.
   */
  static async getTaskComments(
    taskId: string,
    userId: string
  ): Promise<ICommentDocument[]> {
    const task = await Task.findById(taskId);
    if (!task) throw ApiError.notFound('Task not found');

    await assertProjectMember(task.project.toString(), userId);

    return Comment.find({ task: taskId })
      .populate(COMMENT_POPULATE)
      .sort({ createdAt: -1 });
  }

  /**
   * Delete a comment. Caller must be the comment author or a project admin.
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await Comment.findById(commentId);
    if (!comment) throw ApiError.notFound('Comment not found');

    const isAuthor = comment.author.toString() === userId;

    if (!isAuthor) {
      // Check if user is a project admin via the task's project
      const task = await Task.findById(comment.task);
      if (!task) throw ApiError.notFound('Task not found');

      const project = await Project.findById(task.project);
      if (!project) throw ApiError.notFound('Project not found');

      const isProjectOwner = project.owner.toString() === userId;
      const memberEntry = project.members.find((m) => m.user.toString() === userId);
      const isAdmin = memberEntry?.role === 'admin';

      if (!isProjectOwner && !isAdmin) {
        throw ApiError.forbidden(
          'Only the comment author or a project admin can delete this comment'
        );
      }
    }

    await Comment.findByIdAndDelete(commentId);
  }
}

export default TaskService;
