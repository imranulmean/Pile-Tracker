import express from 'express';
import { bulkImport, deleteReg, loadRegister, saveReg } from '../controllers/register.controller.js';

const router= express.Router();
router.post('/saveReg', saveReg);
router.get('/loadRegister/:projectId', loadRegister);
router.post('/bulkImport', bulkImport);
router.delete("/deleteReg/:id", deleteReg);

export default router;