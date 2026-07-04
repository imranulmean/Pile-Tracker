import express from 'express';
import { bulkImport, loadRegister, saveReg } from '../controllers/register.controller.js';

const router= express.Router();
router.post('/saveReg', saveReg);
router.get('/loadRegister/:projectId', loadRegister);
router.post('/bulkImport', bulkImport);

export default router;