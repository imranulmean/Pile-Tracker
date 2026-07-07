import express from 'express';
import { deletePile, savePile } from '../controllers/pile.controller.js';

const router = express.Router();

router.post('/savePile',savePile)
router.delete("/deletePile/:projectId/:pileRef", deletePile);

export default router;