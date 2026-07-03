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
},{ timestamps: true })

export const Register= mongoose.model("Register", RegisterSchema);

const PileSchema = new mongoose.Schema({
    ...RegisterSchema.obj,
    registerId: { type: String},
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    actualDepth: { type: String },
    actualDia: { type: String },
    cageStatus: { type: String },
    concreteDocket: { type: String },
    concreteVol: { type: String },
    cutoffRL: { type: String },
    deliveredGrade: { type: String },
    dia: { type: String },
    drillDate: { type: String },
    driller: { type: String },
    grade: { type: String },
    gridRef: { type: String },
    hp:{
        cage:{
            date: { type: String },
            hasPhoto: { type: String },
            inspector: { type: String },
            released: { type: Boolean, default: false },
        },
        drill:{
            date: { type: String },
            hasPhoto: { type: String },
            inspector: { type: String },
            released: { type: Boolean, default: false },
        },
        pour:{
            date: { type: String },
            hasPhoto: { type: String },
            inspector: { type: String },
            released: { type: Boolean, default: false },
        }
    },
    pourDate: { type: String },
    projectId: { type: String },
    qaInspector: { type: String },
    qaNotes: { type: String },
    qaStatus: { type: String },
    photos:{
        drill: { type: String, default:null }, 
        cage: { type: String, default:null }, 
        pour: { type: String, default:null }
    }
},{ timestamps: true })

export const Pile= mongoose.model("Pile", PileSchema);
