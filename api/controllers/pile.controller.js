import { Pile, Register } from "../models/pile.model.js";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const PHOTO_DIR = path.join(process.cwd(), "uploads", "pile-photos");

async function savePhoto(photo, pileId, type) {
    // Already a URL/path
    if (!photo || !photo.startsWith("data:image")) {
        return photo;
    }

    // data:image/jpeg;base64,/9j/4AAQ...
    const match = photo.match(/^data:(image\/.+);base64,(.+)$/);

    if (!match) {
        throw new Error(`Invalid ${type} image.`);
    }

    const mime = match[1];
    const base64 = match[2];

    const ext = mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1];

    await fs.mkdir(PHOTO_DIR, { recursive: true });

    const filename = `${pileId}_${type}.${ext}`;

    const filepath = path.join(PHOTO_DIR, filename);

    await fs.writeFile(filepath, Buffer.from(base64, "base64"));

    // This is what will be stored in Mongo
    return `/uploads/pile-photos/${filename}`;
}

export const savePile = async(req, res)=>{
    const{_id, __v, ...rest} = req.body;
    // console.log(rest);
    if (rest.photos) {
        const photos = { ...rest.photos };

        for (const type of ["drill", "cage", "pour"]) {
            if (photos[type]) {
                photos[type] = await savePhoto( photos[type], rest.id, type );
            }
        }

        rest.photos = photos;
    }

    try {
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
    } catch (err) {
        res.json({success: false, message: err.message });
    }
     
}


export const deletePile = async (req, res) => {
    try {
        const { id } = req.params;

        const pile = await Pile.findOneAndDelete({ id });

        if (!pile) {
            return res.json({
                success: false,
                message: "Pile not found."
            });
        }

        res.json({
            success: true,
            message: "Pile deleted successfully."
        });
    } catch (err) {
        res.json({
            success: false,
            message: err.message
        });
    }
};

// export const loadRegister = async(req, res)=>{
//     const register = await Register.find({ projectId: req.params.projectId });
//     res.json({success: true, message: register});       
// }

