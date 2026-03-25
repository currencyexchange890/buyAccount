import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    depositBalance: { type: Number, default: 0 },
    withdrawBalance: { type: Number, default: 0 },

    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },

    myReferCode: { type: String, unique: true, sparse: true, trim: true },
    myReferList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    byRefer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    referBonus: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model("User", UserSchema)