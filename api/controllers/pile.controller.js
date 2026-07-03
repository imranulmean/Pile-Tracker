import { Pile, Register } from "../models/pile.model.js";

export const savePile = async(req, res)=>{
    const{_id, __v, ...rest} = req.body;
    const pile = await Pile.findOneAndUpdate(
                        { id: req.body.id },
                        { $set: rest },
                        { new: true, upsert: true }
                    );
                 
    const register = await Register.findOneAndUpdate(
        { id: req.body.registerId },
        { $set: rest },
        { new: true }
    );                         
    res.json({success: true, message: "Pile Saved", register, pile});       
}



// export const loadRegister = async(req, res)=>{
//     const register = await Register.find({ projectId: req.params.projectId });
//     res.json({success: true, message: register});       
// }

