import { Router } from 'express';
import UserController from '../controllers/userController';
import authenticate, { authorize } from '../middleware/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management and admin user operations
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     description: Returns the full profile of the currently logged-in user. Sensitive fields (password, tokens) are excluded.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   _id: 64abc123
 *                   firstName: John
 *                   lastName: Doe
 *                   email: john@example.com
 *                   role: user
 *                   isEmailVerified: true
 *                   isActive: true
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', UserController.getProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update the authenticated user's profile
 *     description: Allows updating firstName, lastName, and avatar only.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 example: Johnny
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 example: Doe
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/avatar.jpg
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Profile updated successfully
 *               data:
 *                 user: {}
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', UserController.updateProfile);

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: Change the authenticated user's password
 *     description: Verifies current password, sets new password, and invalidates all existing refresh tokens.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldSecret123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Must contain at least one uppercase letter and one number
 *                 example: NewSecret456
 *     responses:
 *       200:
 *         description: Password changed. User must log in again.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Password changed successfully. Please log in again.
 *       400:
 *         description: Current password is incorrect or validation failed
 *       401:
 *         description: Unauthorized
 */
router.put('/change-password', UserController.changePassword);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (admin only)
 *     description: Returns a paginated list of all users. Sensitive fields are excluded.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Results per page (max 100)
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 users: []
 *                 total: 50
 *                 page: 1
 *                 pages: 3
 *       403:
 *         description: Admin access required
 */
router.get('/', authorize('admin'), UserController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID (admin or manager only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 user: {}
 *       403:
 *         description: Admin or manager access required
 *       404:
 *         description: User not found
 */
router.get('/:id', authorize('admin', 'manager'), UserController.getUserById);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user account (admin only)
 *     description: Sets isActive to false and invalidates the user's refresh token. The user will no longer be able to log in.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to deactivate
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User deactivated successfully
 *               data:
 *                 user: { isActive: false }
 *       400:
 *         description: Cannot deactivate your own account
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.patch('/:id/deactivate', authorize('admin'), UserController.deactivateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Hard delete a user and all their data (admin only)
 *     description: Permanently deletes the user along with their tasks, comments, and project memberships. Projects owned by this user are also deleted.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User and all associated data deleted
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: User and all associated data deleted successfully
 *       400:
 *         description: Cannot delete your own account
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 */
router.delete('/:id', authorize('admin'), UserController.deleteUser);

export default router;
