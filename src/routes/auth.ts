import { Router } from 'express';
import AuthController from '../controllers/authController';
import authenticate from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints — registration, login, email verification, password reset, and token management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain at least one uppercase letter and one number
 *                 example: Secret123
 *     responses:
 *       201:
 *         description: Registration successful — verification email sent
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Registration successful. Please check your email to verify your account.
 *               data:
 *                 user:
 *                   _id: 64abc123
 *                   firstName: John
 *                   lastName: Doe
 *                   email: john.doe@example.com
 *                   role: user
 *                   isEmailVerified: false
 *       400:
 *         description: Validation error or email already in use
 */
router.post('/register', AuthController.register);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   post:
 *     summary: Verify email address via token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token received in the email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Email verified successfully. You can now log in.
 *       400:
 *         description: Token invalid or expired
 */
router.post('/verify-email/:token', AuthController.verifyEmail);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: Secret123
 *     responses:
 *       200:
 *         description: Login successful — returns access and refresh tokens
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login successful
 *               data:
 *                 accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials or email not yet verified
 */
router.post('/login', AuthController.login);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Issue a new access token using a valid refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Access token refreshed successfully
 *               data:
 *                 accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Refresh token invalid, expired, or revoked
 */
router.post('/refresh-token', AuthController.refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Reset email sent if account exists (same response regardless to prevent enumeration)
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: If an account with that email exists, a password reset link has been sent.
 */
router.post('/forgot-password', AuthController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Reset password using a valid reset token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from the email link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain at least one uppercase letter and one number
 *                 example: NewSecret123
 *     responses:
 *       200:
 *         description: Password reset successfully — all existing sessions invalidated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Password reset successful. You can now log in with your new password.
 *       400:
 *         description: Token invalid or expired
 */
router.post('/reset-password/:token', AuthController.resetPassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out the authenticated user (invalidates refresh token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Logged out successfully
 *       401:
 *         description: Unauthorized — missing or invalid Bearer token
 */
router.post('/logout', authenticate, AuthController.logout);

export default router;
