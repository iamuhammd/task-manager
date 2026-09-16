import { Router } from 'express';
import ProjectController from '../controllers/projectController';
import authenticate from '../middleware/authMiddleware';

const router = Router();

// All project routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management — create, update, archive, and manage team members
 */

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Website Redesign
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Complete overhaul of the company website
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["design", "frontend"]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["q4-2024", "priority"]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Project created successfully. Owner is automatically added as admin member.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Project created successfully
 *               data:
 *                 project:
 *                   _id: 64abc123
 *                   name: Website Redesign
 *                   owner: { _id: 64def456, firstName: John, lastName: Doe, email: john@example.com }
 *                   members: [{ user: { _id: 64def456 }, role: admin, joinedAt: "2024-01-01" }]
 *                   status: active
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', ProjectController.createProject);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects for the authenticated user
 *     description: Returns projects where the user is either the owner or a member
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 count: 2
 *                 projects: []
 *       401:
 *         description: Unauthorized
 */
router.get('/', ProjectController.getAllProjects);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 project: {}
 *       403:
 *         description: Not a member of this project
 *       404:
 *         description: Project not found
 */
router.get('/:id', ProjectController.getProjectById);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update a project
 *     description: Requires owner or admin/manager membership
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.put('/:id', ProjectController.updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project permanently (owner only)
 *     description: Deletes the project and all associated tasks. Irreversible.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project and all its tasks deleted
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Project and all associated tasks deleted successfully
 *       403:
 *         description: Only the project owner can delete a project
 *       404:
 *         description: Project not found
 */
router.delete('/:id', ProjectController.deleteProject);

/**
 * @swagger
 * /projects/{id}/archive:
 *   patch:
 *     summary: Archive a project
 *     description: Sets project status to 'archived'. Requires owner or admin/manager.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project archived
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Project archived successfully
 *               data:
 *                 project: { status: archived }
 *       400:
 *         description: Project is already archived
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.patch('/:id/archive', ProjectController.archiveProject);

/**
 * @swagger
 * /projects/{id}/restore:
 *   patch:
 *     summary: Restore an archived project
 *     description: Sets project status back to 'active'. Requires owner or admin/manager.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project restored
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Project restored successfully
 *               data:
 *                 project: { status: active }
 *       400:
 *         description: Project is already active
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.patch('/:id/restore', ProjectController.restoreProject);

/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     summary: Add a member to a project
 *     description: Requires owner or admin/manager. User must exist and not already be a member.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to add
 *                 example: 64abc123
 *               role:
 *                 type: string
 *                 enum: [admin, manager, member]
 *                 default: member
 *     responses:
 *       200:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Member added to project successfully
 *               data:
 *                 project: {}
 *       400:
 *         description: User is already a member
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project or user not found
 */
router.post('/:id/members', ProjectController.addMember);

/**
 * @swagger
 * /projects/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from a project
 *     description: Requires owner or admin/manager. The project owner cannot be removed.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the member to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Member removed from project successfully
 *               data:
 *                 project: {}
 *       400:
 *         description: Cannot remove the project owner
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project or member not found
 */
router.delete('/:id/members/:memberId', ProjectController.removeMember);

export default router;
