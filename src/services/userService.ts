import User, { IUser } from '../models/User';
import ApiError from '../utils/ApiError';

export class UserService {
  public static async getAllUsers(): Promise<IUser[]> {
    return User.find().select('-password');
  }

  public static async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  public static async updateUser(id: string, updateData: Partial<IUser>): Promise<IUser> {
    if (updateData.email) {
      const existingUser = await User.findOne({ email: updateData.email.toLowerCase(), _id: { $ne: id } });
      if (existingUser) {
        throw new ApiError(400, 'Email is already in use by another account');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    return updatedUser;
  }

  public static async deleteUser(id: string): Promise<void> {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      throw new ApiError(404, 'User not found');
    }
  }
}

export default UserService;
