import Task, { ITask } from '../models/Task';
import Comment, { IComment } from '../models/Comment';
import Project from '../models/Project';
import ApiError from '../utils/ApiError';
import { TaskStatus, TaskPriority } from '../types';

export interface CreateTaskInput {
  title: string;
  description?: string;
  project: string;
  assignedTo?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
}

export interface TaskFilterOptions {
  project?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
}

export class TaskService {
  public static async createTask(data: CreateTaskInput, createdById: string): Promise<ITask> {
    const project = await Project.findById(data.project);
    if (!project) {
      throw new ApiError(404, 'Associated project not found');
    }

    const task = await Task.create({
      ...data,
      createdBy: createdById,
    });

    return task.populate('project assignedTo createdBy', 'name email avatar title');
  }

  public static async getTasks(filters: TaskFilterOptions): Promise<ITask[]> {
    const query: any = {};
    if (filters.project) query.project = filters.project;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    return Task.find(query).populate('project assignedTo createdBy', 'name email avatar title');
  }

  public static async getTaskById(taskId: string): Promise<ITask> {
    const task = await Task.findById(taskId).populate('project assignedTo createdBy', 'name email avatar title');
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }
    return task;
  }

  public static async updateTask(taskId: string, updateData: Partial<ITask>): Promise<ITask> {
    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    }).populate('project assignedTo createdBy', 'name email avatar title');

    if (!updatedTask) {
      throw new ApiError(404, 'Task not found');
    }

    return updatedTask;
  }

  public static async deleteTask(taskId: string): Promise<void> {
    const task = await Task.findByIdAndDelete(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }
    // Delete related comments
    await Comment.deleteMany({ task: taskId });
  }

  public static async addComment(taskId: string, authorId: string, content: string): Promise<IComment> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    const comment = await Comment.create({
      task: taskId,
      author: authorId,
      content,
    });

    return comment.populate('author', 'name email avatar');
  }

  public static async getTaskComments(taskId: string): Promise<IComment[]> {
    return Comment.find({ task: taskId }).populate('author', 'name email avatar').sort({ createdAt: -1 });
  }
}

export default TaskService;
