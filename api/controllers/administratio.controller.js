import User from '../models/user.model.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';


export const createUser= async (req, res) => {
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

}

export const loginUser = async (req, res)=>{
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
                  process.env.JWT_SECRET
    );

    const { password: pass, ...rest } = validUser._doc;  
    res.json({success: true, message: "User Login Success", rest, token});

}

export const updateUser = async(req, res)=>{
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
}

export const getUsers= async(req, res)=>{
    try {
        const users= await User.find();
        res.json({success:true, message: users});
    } catch (error) {
        res.json({success:false, message: error.message});
    }

}