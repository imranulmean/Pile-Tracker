import express from 'express';
import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import MailLog from '../models/mailSent.model.js';


export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({ success:false, message: "No token" });
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(401).json({ success:false, message: "Unauthorized" });  
        }
        const validUser= await User.findById({_id:user.id});
        if(!validUser){
            return res.status(401).json({ success:false, message: "Unauthorized" });  
        }
        req.user = user;
        next();
    });
  };

const router = express.Router();

router.get('/test',(req, res)=>{
    res.json({message:"hello"});
})

router.post('/createUser', async (req, res)=>{
    const {username, password, role} = req.body;
    const hashedPass= bcryptjs.hashSync(password, 10);
    const user = await User.findOne({ username });
    if(user){
        return res.json({success: true, message: "User Already Exists"});
    }
    const userObj= { username, password: hashedPass, role};
    const newUser = new User(userObj);
    const userRes= await newUser.save();
    res.json({success: true, message: "User Created", userRes});

})

router.post('/loginUser', async (req, res)=>{
    const {username, password} = req.body;
    const validUser = await User.findOne({ username });
    if(!validUser){
        return res.json({success: false, message: "User Not Found"});
    }

    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
        return res.json({success: false, message: "Userid or Password is wrong"});
      }   

    const token = jwt.sign({ id: validUser._id, role: validUser.role},
                  process.env.JWT_SECRET,
                  { expiresIn:"8h" }
    );

    const { password: pass, ...rest } = validUser._doc;  
    res.json({success: true, message: "User Login Success", rest, token});

})

router.post('/updateUser', verifyToken, async (req, res)=>{
    const {userId, updatedPass, updatedRole} = req.body;
    const updatedField={};
    if(updatedRole) updatedField.role=updatedRole
    if(updatedPass) updatedField.password=bcryptjs.hashSync(updatedPass, 10)
    const validUser = await User.findByIdAndUpdate( 
        {_id:userId}, 
        {$set:updatedField}, 
        { new:true } 
    ).select('-password');
    if(!validUser){
        return res.json({success: false, message: "User Not Found"});
    }
    res.json({success: true, message: "User Update Success",validUser});
})

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


router.get('/users',verifyToken, async(req, res)=>{
    try {
        const users= await User.find();
        res.json({success:true, message: users});
    } catch (error) {
        res.json({success:false, message: error.message});
    }

})

router.get('/getMails',verifyToken, async(req, res)=>{
    try {
        const { fromDate, toDate } = req.query;
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(toDate);  
        to.setHours(23, 59, 59, 999)      
        const docs= await MailLog.find({createdAt: { $gte: from, $lte: to }});
        res.json({success:true, data:docs});        
    } catch (error) {
        res.json({success:false, message: error.message});
    }
})


export default router;