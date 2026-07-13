import express from 'express';
import { deletePile, savePile } from '../controllers/pile.controller.js';
import { verifyRole, verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/savePile',verifyToken, verifyRole('admin'),savePile)
router.delete("/deletePile/:id",verifyToken, verifyRole('admin'), deletePile);

export default router;