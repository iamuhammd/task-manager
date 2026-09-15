import { Router } from 'express';
import UserController from '../controllers/userController';
import authenticate, { authorize } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/me', UserController.getProfile);
router.get('/', authorize('admin'), UserController.getUsers);
router.get('/:id', UserController.getUserById);
router.put('/:id', UserController.updateUser);
router.delete('/:id', authorize('admin'), UserController.deleteUser);

export default router;
