import { Router } from 'express';
import ProjectController from '../controllers/projectController';
import authenticate from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.post('/', ProjectController.createProject);
router.get('/', ProjectController.getProjects);
router.get('/:id', ProjectController.getProjectById);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.post('/:id/members', ProjectController.addMember);

export default router;
