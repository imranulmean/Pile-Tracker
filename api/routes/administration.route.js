import express from 'express';
import { createUser, getRoles, getUsers, loginUser, updateUser } from '../controllers/administratio.controller.js';
import { verifyRole, verifyToken } from '../middleware/verifyToken.js';


const router = express.Router();

router.get('/test',(req, res)=>{
    res.json({message:"hello"});
})

router.post('/createUser',verifyToken, verifyRole('admin'), createUser)
router.post('/login', loginUser)
router.post('/updateUser',verifyToken, verifyRole('admin'), updateUser)
router.get('/getRoles',verifyToken, verifyRole('admin'), getRoles)
router.get('/getUsers',verifyToken, verifyRole('admin'), getUsers)

export default router;