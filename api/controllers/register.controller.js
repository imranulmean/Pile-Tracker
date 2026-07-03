import { Pile, Register } from "../models/pile.model.js";

export const saveReg = async(req, res)=>{
    const{_id, __v, ...rest} = req.body;
    const register = await Register.findOneAndUpdate(
                        { id: req.body.id },
                        { $set: rest },
                        { new: true, upsert: true }
                    );
    
    const registerId = req.body.id;                         
    const pile = await Pile.findOneAndUpdate(
        { registerId },
        { 
            $set: {
                ...rest,
                registerId
            } 
        },
        { new: true }
    );                    
    res.json({success: true, message: "Register Saved", register, pile});       
}

export const loadRegister = async(req, res)=>{
    const register = await Register.find({ projectId: req.params.projectId });
    const piles = await Pile.find({ projectId: req.params.projectId });
    res.json({success: true, register, piles});       
}

