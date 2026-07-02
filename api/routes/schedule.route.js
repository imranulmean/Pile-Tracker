import express from 'express';
import { Schedule } from "../models/schedule.model.js";
import { verifyToken } from './administration.route.js';

const router= express.Router();

router.get('/getSchedule', verifyToken, async (req, res) => {
    try {
        let schedule = await Schedule.findOne();
        // create default if not exists
        if (!schedule) {
            schedule = await Schedule.create({
                isActive: true,
                workingDays: [0,1,2,3,4],
                startHour: 10,
                endHour: 18,
                offDays: []
            });
        }
        res.json({ success: true, schedule });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})

router.post('/updateSchedule', verifyToken,async (req, res) => {
    try {
        const { isActive, workingDays, startHour, endHour, offDays } = req.body;

        const schedule = await Schedule.findOneAndUpdate(
            {},
            { $set: { isActive, workingDays, startHour, endHour, offDays } },
            { new: true, upsert: true }
        );
        res.json({ success: true, message:"Schedule Update Success" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
})

export default router;