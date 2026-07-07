import express from 'express';
import { createUser, getUsers, loginUser, updateUser } from '../controllers/administratio.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';




const router = express.Router();

router.get('/test',(req, res)=>{
    res.json({message:"hello"});
})

router.post('/createUser', createUser)

router.post('/login', loginUser)

router.post('/updateUser', verifyToken, updateUser)

router.post('/deleteMail',verifyToken, async(req, res)=>{
    try {
        const { mailId } = req.body;
        const validMail = await MailLog.findByIdAndDelete({_id:mailId});
        res.json({success: true, message: "Mail delete Success"});
    } catch (error) {
        res.json({success:false, message: error.message});
    }
})

router.get('/checkToken', verifyToken, async(req, res)=>{
    res.json({success:true, message:"Authenticated"})
})


router.get('/getUsers',verifyToken, getUsers)



export default router;