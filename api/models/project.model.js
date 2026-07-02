import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        name: { type: String },
        code: { type: String },
        location: { type: String },
        contractNo: { type: String },
}, { timestamps: true });

export const Project = mongoose.model('Project', ProjectSchema);