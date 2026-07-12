import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type:String, required:true, unique: true, lowercase: true, trim: true },
    password:{ type: String, required:true },
    role: { type: String, required: true},
    disabled:{type: Boolean, required: true, default:false}

}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;