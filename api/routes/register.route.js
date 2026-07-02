import express from 'express';
import { loadRegister, saveReg } from '../controllers/register.controller.js';

const router= express.Router();
router.post('/saveReg', saveReg);
router.get('/loadRegister/:projectId', loadRegister);

export default router;