import { Project } from "../models/project.model.js";

export const saveProject = async(req, res)=>{
    const{_id, __v, ...rest} = req.body;
    const project = await Project.findOneAndUpdate(
                        { id: rest.id },
                        { $set: rest },
                        { new: true, upsert: true }
                    );

    res.json({success: true, message: "Project Saved", project});    
}

export const getProjects = async(req, res)=>{
    const projects = await Project.find({});
    res.json({success: true, message: projects});    
}