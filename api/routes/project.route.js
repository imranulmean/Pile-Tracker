import express from 'express';
import { getProjects, saveProject } from '../controllers/project.controller.js';

const router = express.Router();
router.post('/saveProject', saveProject);
router.get('/getProjects', getProjects);

export default router;