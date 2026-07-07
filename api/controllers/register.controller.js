import { Pile, Register } from "../models/pile.model.js";

export const saveReg = async(req, res)=>{
    const{_id, __v, ...rest} = req.body;
    const register = await Register.findOneAndUpdate(
                        { projectId: rest.projectId, pileRef: rest.pileRef },
                        { $set: rest },
                        { new: true, upsert: true }
                    );
    
    const registerId = req.body.id;                         
    const pile = await Pile.findOneAndUpdate(
        { projectId: rest.projectId, pileRef: rest.pileRef },
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

export const bulkImport = async (req, res) => {
    try {
        const registers = req.body;

        const operations = registers.map((item) => {
            const { _id, __v, ...rest } = item;

            return {
                updateOne: {
                    filter: { id: rest.id },
                    update: { $set: rest },
                    upsert: true
                }
            };
        });

        const result = await Register.bulkWrite(operations);

        res.json({ success: true, message: `${registers.length} registers imported`, result });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const loadRegister = async(req, res)=>{
    const register = await Register.find({ projectId: req.params.projectId });
    const piles = await Pile.find({ projectId: req.params.projectId });
    res.json({success: true, register, piles});       
}

