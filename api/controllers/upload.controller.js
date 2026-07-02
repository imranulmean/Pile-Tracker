import multer from 'multer'
import fs from 'fs/promises';
import path from "path";
import { getSession } from './login.controller.js';
import { addDownTime } from './saveDb.controller.js';
import moment from 'moment';

const storageLocal = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "client/public/localFolder");
    },
    filename: (req, file, cb) => {
        // cb(null, ${new Date().getTime()}-${file.originalname});
        // const savedFile=`${new Date().getTime()}-${file.originalname}`;
        const savedFile=`${file.originalname}`;
        cb(null, savedFile);
    },
});


const storagePic = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "client/public/profile");
    },
    filename: (req, file, cb) => {
        const username = req.body.username;
        // const ext = path.extname(file.originalname);
        cb(null, `${username}.png`); // imraunl.png
    },
});

const uploadLocalMul = multer({ storage:storageLocal });  
const uploadPicMul= multer({ storage:storagePic });  


export const uploadLocal = async(req, res)=>{    
    uploadLocalMul.array("files")(req, res, async (err) => {
        try {
            if (err) {
                console.error("Multer Error:", err);
                return res.status(500).json({ error: err.message });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: "No files uploaded" });
            }

            if(req.body.sourceUrl && req.body.sourceUrl==='addDowntime'){
                if(!req.body.sessionToken){
                    await fs.unlink(req.files[0].path);
                    return res.json({ success: true, message: "No Session Found", docs:[] });
                }
                const sessionData= getSession(req.body.sessionToken);
                const {success, message, docs}= await addDownTime(req.files[0].path, sessionData);
                res.json({success, message, docs});                
            }
            else{
                res.json({ success: true, message:"Files Uploaded Success"});
            }
            
        } catch (error) {
            res.status(500).json({ success: false, message: "Error saving data" });
        }
    });
}
