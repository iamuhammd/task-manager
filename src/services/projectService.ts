import Project, { IProject } from '../models/Project';
import ApiError from '../utils/ApiError';

export interface CreateProjectInput {
  name: string;
  description?: string;
  members?: string[];
}

export class ProjectService {
  public static async createProject(data: CreateProjectInput, ownerId: string): Promise<IProject> {
    const project = await Project.create({
      ...data,
      owner: ownerId,
      members: data.members ? [...new Set([...data.members, ownerId])] : [ownerId],
    });

    return project.populate('owner members', 'name email avatar');
  }

  public static async getAllProjects(userId: string): Promise<IProject[]> {
    return Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).populate('owner members', 'name email avatar');
  }

  public static async getProjectById(projectId: string): Promise<IProject> {
    const project = await Project.findById(projectId).populate('owner members', 'name email avatar');
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }
    return project;
  }

  public static async updateProject(projectId: string, userId: string, updateData: Partial<IProject>): Promise<IProject> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ApiError(403, 'Only project owner can update project details');
    }

    const updated = await Project.findByIdAndUpdate(projectId, updateData, {
      new: true,
      runValidators: true,
    }).populate('owner members', 'name email avatar');

    return updated!;
  }

  public static async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ApiError(403, 'Only project owner can delete project');
    }

    await Project.findByIdAndDelete(projectId);
  }

  public static async addMember(projectId: string, userId: string, newMemberId: string): Promise<IProject> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    if (project.owner.toString() !== userId) {
      throw new ApiError(403, 'Only project owner can add team members');
    }

    if (!project.members.map(m => m.toString()).includes(newMemberId)) {
      project.members.push(newMemberId as any);
      await project.save();
    }

    return project.populate('owner members', 'name email avatar');
  }
}

export default ProjectService;
