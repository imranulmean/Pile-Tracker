import jwt from 'jsonwebtoken';
import { ROLES } from '../controllers/administratio.controller.js';
import User from '../models/user.model.js';

export const verifyToken = async(req, res, next) => {
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
        req.user = validUser;
        next();
    });
  };

  export const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Not Preveiliged"
            });
        }

        next();
    };
};