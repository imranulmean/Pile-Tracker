import { ROLES } from "../controllers/administratio.controller.js";
import User from "../models/user.model.js";
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log('MongoDb is connected');
  })
  .catch((err) => {
    console.log(err.message);
  });

const createUser= async (username, password, role) => {
    const hashedPass= bcryptjs.hashSync(password, 10);
    const isRoleAvailable= ROLES.includes(role.toLowerCase().trim());    
    try{
        const user = await User.findOne({ username });
        if(user){
            console.log("User Already Exists")
            return process.exit(0);
        }
        if(!isRoleAvailable){
            console.log("Role Not Defined")
            return process.exit(0);
        }
        const userObj= { username, password: hashedPass, role};
        const newUser = new User(userObj);
        const userRes= await newUser.save();
       console.log("User Created")
       console.log(userRes.toObject());
       process.exit(0);
    }catch(err){
       console.log(err.message)
       process.exit(1);
    }
}

await createUser('testuser', 'Asdf_1234', 'scheduler')