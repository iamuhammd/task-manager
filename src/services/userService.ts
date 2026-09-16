import mongoose from 'mongoose';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
import Comment from '../models/Comment';
import ApiError from '../utils/ApiError';
import { IUserDocument } from '../types';

// ─── Sensitive fields always excluded from queries ────────────────────────────
const SAFE_SELECT =
  '-password -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires -refreshToken';

// ─── Service ──────────────────────────────────────────────────────────────────

export class UserService {
  /** Return the authenticated user's own profile (no sensitive fields). */
  static async getProfile(userId: string): Promise<IUserDocument> {
    const user = await User.findById(userId).select(SAFE_SELECT);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  /** Update only firstName, lastName, avatar on the authenticated user. */
  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; avatar?: string }
  ): Promise<IUserDocument> {
    const updated = await User.findByIdAndUpdate(userId, data, {
      new: true,
      runValidators: true,
    }).select(SAFE_SELECT);
    if (!updated) throw ApiError.notFound('User not found');
    return updated;
  }

  /** Verify current password, set new password, invalidate refresh token. */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password +refreshToken');
    if (!user) throw ApiError.notFound('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

    user.password = newPassword;
    user.refreshToken = undefined; // invalidate all sessions
    await user.save();
  }

  /** Admin only — paginated list of all users. */
  static async getAllUsers(
    page: number,
    limit: number
  ): Promise<{ users: IUserDocument[]; total: number; page: number; pages: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find().select(SAFE_SELECT).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(),
    ]);
    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  /** Admin or manager — get single user by id. */
  static async getUserById(id: string): Promise<IUserDocument> {
    const user = await User.findById(id).select(SAFE_SELECT);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  /** Admin only — soft deactivate a user. */
  static async deactivateUser(targetId: string, requesterId: string): Promise<IUserDocument> {
    if (targetId === requesterId) throw ApiError.badRequest('You cannot deactivate your own account');
    const user = await User.findByIdAndUpdate(
      targetId,
      { isActive: false, refreshToken: undefined },
      { new: true }
    ).select(SAFE_SELECT);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  /** Admin only — hard delete a user and all associated data. */
  static async deleteUser(targetId: string, requesterId: string): Promise<void> {
    if (targetId === requesterId) throw ApiError.badRequest('You cannot delete your own account');
    const user = await User.findById(targetId);
    if (!user) throw ApiError.notFound('User not found');

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Remove all tasks they created or were assigned to
      const createdTaskIds = await Task.find({ createdBy: targetId }).distinct('_id');
      await Comment.deleteMany({ task: { $in: createdTaskIds } });
      await Task.deleteMany({ createdBy: targetId });
      await Task.updateMany({ assignedTo: targetId }, { $unset: { assignedTo: 1 } });

      // Remove from project members; delete projects they own
      await Project.updateMany(
        { 'members.user': targetId },
        { $pull: { members: { user: targetId } } }
      );
      const ownedProjectIds = await Project.find({ owner: targetId }).distinct('_id');
      await Task.deleteMany({ project: { $in: ownedProjectIds } });
      await Project.deleteMany({ owner: targetId });

      // Delete comments authored by user
      await Comment.deleteMany({ author: targetId });

      await User.findByIdAndDelete(targetId);
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}

export default UserService;
