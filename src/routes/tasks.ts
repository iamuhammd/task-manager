import { Router } from 'express';
import TaskController from '../controllers/taskController';
import authenticate from '../middleware/authMiddleware';

const router = Router();

// All task routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management — create, update, assign, track status, and manage comments
 */

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task in a project
 *     description: Caller must be a member of the referenced project. Owner is auto-set from JWT.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, projectId]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 example: Implement login page
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Build the UI and hook up the auth API
 *               projectId:
 *                 type: string
 *                 example: 64abc123
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign the task to
 *                 example: 64def456
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T00:00:00.000Z"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["frontend", "auth"]
 *     responses:
 *       201:
 *         description: Task created with initial activity log entry
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Task created successfully
 *               data:
 *                 task:
 *                   _id: 64abc789
 *                   title: Implement login page
 *                   status: todo
 *                   priority: medium
 *                   activityLog: [{ action: "Task created" }]
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Project not found
 */
router.post('/', TaskController.createTask);

/**
 * @swagger
 * /tasks/project/{projectId}:
 *   get:
 *     summary: Get all tasks for a project
 *     description: Caller must be a member of the project. Supports optional filters via query params.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in-progress, review, done]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by task priority
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *     responses:
 *       200:
 *         description: List of tasks for the project
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 count: 3
 *                 tasks: []
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Project not found
 */
router.get('/project/:projectId', TaskController.getProjectTasks);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     description: Caller must be a member of the task's project.
 *     tags: [Tasks]
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
 *         description: Task details with populated assignee, creator, and activity log
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 task: {}
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Task not found
 */
router.get('/:id', TaskController.getTaskById);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task's fields
 *     description: Caller must be a project member. An activity log entry is added for each changed field.
 *     tags: [Tasks]
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
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               assignedTo:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Task updated with activity log entries for each changed field
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Task updated successfully
 *               data:
 *                 task: {}
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Task not found
 */
router.put('/:id', TaskController.updateTask);

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update a task's status only
 *     description: Accessible by any project member or the task's assignee.
 *     tags: [Tasks]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [todo, in-progress, review, done]
 *                 example: in-progress
 *     responses:
 *       200:
 *         description: Task status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Task status updated to "in-progress"
 *               data:
 *                 task: { status: in-progress }
 *       400:
 *         description: Invalid status value
 *       403:
 *         description: Not a project member or assignee
 *       404:
 *         description: Task not found
 */
router.patch('/:id/status', TaskController.updateTaskStatus);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task permanently
 *     description: Only the project owner or the task creator can delete a task. All comments are also deleted.
 *     tags: [Tasks]
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
 *         description: Task and all its comments deleted
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Task and its comments deleted successfully
 *       403:
 *         description: Only the project owner or task creator can delete
 *       404:
 *         description: Task not found
 */
router.delete('/:id', TaskController.deleteTask);

/**
 * @swagger
 * /tasks/{id}/comments:
 *   post:
 *     summary: Add a comment to a task
 *     description: Caller must be a project member. Supports @mentions by user ID.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Please review the PR when you get a chance.
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of User IDs to mention
 *                 example: ["64abc123", "64def456"]
 *     responses:
 *       201:
 *         description: Comment added and task activity log updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Comment added successfully
 *               data:
 *                 comment:
 *                   _id: 64aaa111
 *                   content: Please review the PR when you get a chance.
 *                   author: { firstName: John, lastName: Doe }
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Task not found
 */
router.post('/:id/comments', TaskController.addComment);

/**
 * @swagger
 * /tasks/{id}/comments:
 *   get:
 *     summary: Get all comments for a task
 *     description: Caller must be a project member. Comments are sorted newest first.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *     responses:
 *       200:
 *         description: List of comments with author details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 count: 2
 *                 comments: []
 *       403:
 *         description: Not a project member
 *       404:
 *         description: Task not found
 */
router.get('/:id/comments', TaskController.getTaskComments);

/**
 * @swagger
 * /tasks/{id}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Only the comment author or a project admin can delete a comment.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Comment deleted successfully
 *       403:
 *         description: Only the author or project admin can delete this comment
 *       404:
 *         description: Comment not found
 */
router.delete('/:id/comments/:commentId', TaskController.deleteComment);

export default router;
