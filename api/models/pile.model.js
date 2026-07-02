import mongoose from 'mongoose';

const RegisterSchema = new mongoose.Schema({
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    projectId: { type: String },
    pileRef: { type: String },
    dia: { type: String },
    grade: { type: String },
    verticalReo: { type: String },
    verticalReoLower: { type: String },
    ligs: { type: String },
    socket: { type: String },
    cutoffRL: { type: String },
    topSteelRL: { type: String },
    gridRef: { type: String },
    cancelled: { type: Boolean, default: false }
},{ timestamps: true },{_id:false})

export const Register= mongoose.model("Register", RegisterSchema);

// const TrkSchema = new mongoose.Schema({},{ timestamps: true },{_id:false})

// const PileSchema = new mongoose.Schema({
//     reg: RegisterSchema,
//     trk:TrkSchema,
// }, { timestamps: true });


// export const Pile = mongoose.model('Pile', PileSchema);