import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import ApiError from '../utils/ApiError';
import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../config/env';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  public static generateTokens(user: IUser): AuthTokens {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessTokenOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    };

    const accessToken = jwt.sign(payload, JWT_SECRET as Secret, accessTokenOptions);
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as Secret, refreshTokenOptions);

    return { accessToken, refreshToken };
  }

  public static async register(input: RegisterInput) {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists');
    }

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      role: input.role || 'user',
    });

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  public static async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  public static async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET as Secret) as { id: string };
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new ApiError(401, 'User not found');
      }

      const tokens = this.generateTokens(user);
      return tokens;
    } catch (error: any) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }
}

export default AuthService;
