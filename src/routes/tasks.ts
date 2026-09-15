import { Router } from 'express';
import TaskController from '../controllers/taskController';
import authenticate from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/', TaskController.createTask);
router.get('/', TaskController.getTasks);
router.get('/:id', TaskController.getTaskById);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);
router.post('/:id/comments', TaskController.addComment);
router.get('/:id/comments', TaskController.getComments);

export default router;
