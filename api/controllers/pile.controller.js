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

export const savePile = async (req, res) => {
    const { _id, __v, ...rest } = req.body;

    let setData = { ...rest };

    console.log(setData)
    // return
    if (rest.hp) {
        for (const key of Object.keys(rest.hp)) {
            setData[`hp.${key}`] = rest.hp[key];
        }
        delete setData.hp;   // remove the whole-object version to avoid path conflict
    }

    if (rest.photos) {
        for (const type of Object.keys(rest.photos)) {
            if (rest.photos[type]) {
                rest.photos[type] = await savePhoto(rest.photos[type], rest.id, type);
            }
            setData[`photos.${type}`] = rest.photos[type];
        }
        delete setData.photos;   // same here
    }

    try {
        const register = await Register.findOneAndUpdate(
            { id: rest.id },
            { $set: rest },
            { new: true, upsert: true }
        );        
        // first check if pile is there
        const savedPile= await Pile.findOne({id: rest.id})
        if(!savedPile){
            // check if register is there. then put those register values in the pile
            const savedRegister= await Register.findOne({id: rest.id});
            setData = { registerId:rest.id , ...savedRegister.toObject(), ...setData, };
            const newPile= new Pile(setData);
            const saved=await newPile.save();
        }
        else{
            const pile = await Pile.findOneAndUpdate(
                { registerId: rest.registerId },
                { $set: setData },
                { new: true, upsert: true }
            );
        }
        res.json({ success: true, message: "Pile Saved" });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

async function deletePhoto(photoPath) {
    if (!photoPath) return;
    const filePath = path.join(process.cwd(), photoPath.replace(/^\//, ""));
    await fs.unlink(filePath);
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
        if (pile.photos) {
            await Promise.all([
                deletePhoto(pile.photos.drill),
                deletePhoto(pile.photos.cage),
                deletePhoto(pile.photos.pour)
            ]);
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

