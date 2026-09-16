import mongoose from 'mongoose';
import Project from '../models/Project';
import Task from '../models/Task';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import {
  IProjectDocument,
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
  ProjectMemberRole,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Populate owner (name, email) and members.user (name, email) */
const POPULATE_OPTIONS = [
  { path: 'owner', select: 'firstName lastName email avatar' },
  { path: 'members.user', select: 'firstName lastName email avatar' },
];

/**
 * Resolve the calling user's membership record in a project.
 * Returns `undefined` if the user is not a member.
 */
function getMemberEntry(project: IProjectDocument, userId: string) {
  return project.members.find((m) => m.user.toString() === userId);
}

/**
 * Verify that the user is either the project owner or an admin/manager member.
 * Throws 403 if not.
 */
function assertOwnerOrAdmin(project: IProjectDocument, userId: string): void {
  const isOwner = project.owner.toString() === userId;
  if (isOwner) return;

  const member = getMemberEntry(project, userId);
  if (!member || (member.role !== 'admin' && member.role !== 'manager')) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
}

/**
 * Verify the calling user is the project owner (strict).
 * Throws 403 if not.
 */
function assertOwnerOnly(project: IProjectDocument, userId: string): void {
  if (project.owner.toString() !== userId) {
    throw ApiError.forbidden('Only the project owner can perform this action');
  }
}

/**
 * Verify the user is at least a member (owner OR any member role).
 * Throws 403 if not.
 */
function assertMember(project: IProjectDocument, userId: string): void {
  const isOwner = project.owner.toString() === userId;
  const isMember = project.members.some((m) => m.user.toString() === userId);
  if (!isOwner && !isMember) {
    throw ApiError.forbidden('You are not a member of this project');
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ProjectService {
  /**
   * Create a new project. The owner is automatically added as an admin member.
   */
  static async createProject(
    ownerId: string,
    input: CreateProjectInput
  ): Promise<IProjectDocument> {
    const project = await Project.create({
      name: input.name,
      description: input.description,
      categories: input.categories ?? [],
      tags: input.tags ?? [],
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      owner: ownerId,
      members: [
        {
          user: new mongoose.Types.ObjectId(ownerId),
          role: 'admin' as ProjectMemberRole,
          joinedAt: new Date(),
        },
      ],
    });

    return project.populate(POPULATE_OPTIONS);
  }

  /**
   * Return all projects where the user is owner or member.
   */
  static async getAllProjects(userId: string): Promise<IProjectDocument[]> {
    const objectId = new mongoose.Types.ObjectId(userId);
    return Project.find({
      $or: [{ owner: objectId }, { 'members.user': objectId }],
    })
      .populate(POPULATE_OPTIONS)
      .sort({ createdAt: -1 });
  }

  /**
   * Get a single project by ID. Throws 404 if not found, 403 if the user
   * is not an owner or member.
   */
  static async getProjectById(
    projectId: string,
    userId: string
  ): Promise<IProjectDocument> {
    const project = await Project.findById(projectId).populate(POPULATE_OPTIONS);
    if (!project) throw ApiError.notFound('Project not found');
    assertMember(project, userId);
    return project;
  }

  /**
   * Update project fields. Only owner or admin/manager members may update.
   */
  static async updateProject(
    projectId: string,
    userId: string,
    input: UpdateProjectInput
  ): Promise<IProjectDocument> {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    assertOwnerOrAdmin(project, userId);

    const updateData: Partial<IProjectDocument> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.categories !== undefined) updateData.categories = input.categories;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.dueDate !== undefined) updateData.dueDate = new Date(input.dueDate);
    if (input.status !== undefined) updateData.status = input.status;

    const updated = await Project.findByIdAndUpdate(projectId, updateData, {
      new: true,
      runValidators: true,
    }).populate(POPULATE_OPTIONS);

    return updated!;
  }

  /**
   * Permanently delete a project and all its tasks. Owner only.
   */
  static async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    assertOwnerOnly(project, userId);

    await Task.deleteMany({ project: projectId });
    await Project.findByIdAndDelete(projectId);
  }

  /**
   * Archive a project (status → 'archived'). Owner or admin/manager only.
   */
  static async archiveProject(
    projectId: string,
    userId: string
  ): Promise<IProjectDocument> {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    assertOwnerOrAdmin(project, userId);

    if (project.status === 'archived') {
      throw ApiError.badRequest('Project is already archived');
    }

    project.status = 'archived';
    await project.save();
    return project.populate(POPULATE_OPTIONS);
  }

  /**
   * Restore an archived project (status → 'active'). Owner or admin/manager only.
   */
  static async restoreProject(
    projectId: string,
    userId: string
  ): Promise<IProjectDocument> {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    assertOwnerOrAdmin(project, userId);

    if (project.status === 'active') {
      throw ApiError.badRequest('Project is already active');
    }

    project.status = 'active';
    await project.save();
    return project.populate(POPULATE_OPTIONS);
  }

  /**
   * Add a user as a member. Requester must be owner or admin/manager.
   * Throws 404 if target user doesn't exist, 400 if already a member.
   */
  static async addMember(
    projectId: string,
    requesterId: string,
    input: AddMemberInput
  ): Promise<IProjectDocument> {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    assertOwnerOrAdmin(project, requesterId);

    const targetUser = await User.findById(input.userId);
    if (!targetUser) throw ApiError.notFound('User not found');

    const alreadyMember = project.members.some(
      (m) => m.user.toString() === input.userId
    );
    if (alreadyMember) {
      throw ApiError.badRequest('User is already a member of this project');
    }

    project.members.push({
      user: new mongoose.Types.ObjectId(input.userId),
      role: input.role ?? 'member',
      joinedAt: new Date(),
    });
    await project.save();
    return project.populate(POPULATE_OPTIONS);
  }

  /**
   * Remove a member from the project. Requester must be owner or admin/manager.
   * The owner cannot be removed.
   */
  static async removeMember(
    projectId: string,
    requesterId: string,
    memberId: string
  ): Promise<IProjectDocument> {
    const project = await Project.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');
    assertOwnerOrAdmin(project, requesterId);

    if (project.owner.toString() === memberId) {
      throw ApiError.badRequest('The project owner cannot be removed from the project');
    }

    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === memberId
    );
    if (memberIndex === -1) {
      throw ApiError.notFound('Member not found in this project');
    }

    project.members.splice(memberIndex, 1);
    await project.save();
    return project.populate(POPULATE_OPTIONS);
  }
}

export default ProjectService;
