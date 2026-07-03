import express from 'express';
import { savePile } from '../controllers/pile.controller.js';

const router = express.Router();

router.post('/savePile',savePile)

export default router;