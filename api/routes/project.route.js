import express from 'express';
import { getProjects, saveProject } from '../controllers/project.controller.js';
import { verifyRole, verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
router.post('/saveProject',verifyToken, verifyRole('admin'), saveProject);
router.get('/getProjects', verifyToken, verifyRole('admin','viewer'), getProjects);

export default router;