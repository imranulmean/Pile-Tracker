import express from 'express';
import { bulkImport, deleteReg, loadRegister, saveReg } from '../controllers/register.controller.js';
import { verifyRole, verifyToken } from '../middleware/verifyToken.js';

const router= express.Router();
router.post('/saveReg',verifyToken, verifyRole('admin'), saveReg);
router.get('/loadRegister/:projectId',verifyToken, verifyRole('admin','viewer'), loadRegister);
router.post('/bulkImport',verifyToken, verifyRole('admin'), bulkImport);
router.delete("/deleteReg/:id",verifyToken, verifyRole('admin'), deleteReg);

export default router;