import { Register } from "../models/pile.model.js";

export const saveReg = async(req, res)=>{
    const register = await Register.findOneAndUpdate(
                        { id: req.body.id },
                        { $set: req.body },
                        { new: true, upsert: true }
                    );
    res.json({success: true, message: "Register Saved", register});       
}

export const loadRegister = async(req, res)=>{
    const register = await Register.find({ projectId: req.params.projectId });
    res.json({success: true, message: register});       
}