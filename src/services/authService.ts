import crypto from 'crypto';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import {
  RegisterInput,
  LoginInput,
  AuthTokens,
  JwtPayload,
  IUserDocument,
} from '../types';
import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  CLIENT_URL,
  NODE_ENV,
} from '../config/env';

// ─── Email Transport ─────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random token, returns both the raw token
 * (to be sent to client) and its SHA-256 hash (to be stored in DB).
 */
function generateSecureToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
}

/**
 * Sign a JWT access token (15 min expiry by default).
 */
function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, JWT_SECRET as Secret, options);
}

/**
 * Sign a JWT refresh token (7d expiry by default).
 */
function signRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET as Secret, options);
}

/**
 * Build a JwtPayload from a user document.
 */
function buildPayload(user: IUserDocument): JwtPayload {
  return {
    id: (user._id as any).toString(),
    email: user.email,
    role: user.role,
  };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Register a new user, generate email verification token, and send
   * a verification email.
   *
   * Returns the created user (without sensitive fields).
   *
   * In development (`NODE_ENV === 'development'`) the user's email is
   * automatically marked as verified so you can log in immediately without
   * real email credentials.
   */
  static async register(input: RegisterInput): Promise<Omit<IUserDocument, 'password'>> {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw ApiError.badRequest('An account with this email already exists');
    }

    const user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      password: input.password,
    });

    // ── Development shortcut ────────────────────────────────────────────────
    // Skip token generation and email sending so you can log in straight away.
    if (NODE_ENV === 'development') {
      user.isEmailVerified = true;
      await user.save({ validateBeforeSave: false });
      logger.info(`[DEV] Email auto-verified for ${user.email} — skipping verification email`);
    } else {
      // ── Production: generate email verification token and send email ──────
      const { rawToken, hashedToken } = generateSecureToken();
      user.emailVerificationToken = hashedToken;
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await user.save({ validateBeforeSave: false });

      const verifyUrl = `${CLIENT_URL}/auth/verify-email/${rawToken}`;
      try {
        await transporter.sendMail({
          from: `"Task Manager" <${EMAIL_USER}>`,
          to: user.email,
          subject: 'Verify your email address',
          html: `
            <h2>Welcome to Task Manager, ${user.firstName}!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verifyUrl}" target="_blank">Verify Email</a>
            <p>This link expires in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
          `,
        });
      } catch (err) {
        // Roll back token fields if email fails; do not block registration
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save({ validateBeforeSave: false });
        logger.error('Failed to send verification email', { err });
      }
    }

    // Return user without password
    const userObject = user.toObject() as any;
    delete userObject.password;
    delete userObject.emailVerificationToken;
    delete userObject.emailVerificationExpires;
    delete userObject.refreshToken;
    return userObject;
  }

  /**
   * Verify a user's email using the token sent during registration.
   */
  static async verifyEmail(token: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw ApiError.badRequest('Email verification token is invalid or has expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
  }

  /**
   * Authenticate a user, issue access + refresh tokens, and persist the
   * refresh token on the user document.
   */
  static async login(input: LoginInput): Promise<AuthTokens> {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select(
      '+password +refreshToken'
    );

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw ApiError.unauthorized('Please verify your email address before logging in');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const payload = buildPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Persist hashed refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  }

  /**
   * Verify a refresh token and issue a new access token.
   */
  static async refreshAccessToken(token: string): Promise<{ accessToken: string }> {
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET as Secret) as JwtPayload;
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.isActive || user.refreshToken !== token) {
      throw ApiError.unauthorized('Refresh token is invalid or has been revoked');
    }

    const accessToken = signAccessToken(buildPayload(user));
    return { accessToken };
  }

  /**
   * Send a password reset email.
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond the same way to prevent email enumeration
    if (!user || !user.isActive) {
      return;
    }

    const { rawToken, hashedToken } = generateSecureToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${CLIENT_URL}/auth/reset-password/${rawToken}`;
    try {
      await transporter.sendMail({
        from: `"Task Manager" <${EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <a href="${resetUrl}" target="_blank">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Failed to send password reset email', { err });
      throw ApiError.internal('Failed to send password reset email. Please try again later.');
    }
  }

  /**
   * Reset the user's password after verifying the reset token.
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +refreshToken');

    if (!user) {
      throw ApiError.badRequest('Password reset token is invalid or has expired');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate all existing sessions
    user.refreshToken = undefined;
    await user.save();
  }

  /**
   * Logout: clear the refresh token stored on the user document.
   */
  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
  }
}

export default AuthService;
