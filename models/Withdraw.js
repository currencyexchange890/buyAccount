import mongoose from "mongoose"

const WithdrawSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    feePercent: {
      type: Number,
      default: 0,
      min: 0,
    },
    feeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    number: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      enum: ["bkash", "nagad"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
)

export default mongoose.models.Withdraw ||
  mongoose.model("Withdraw", WithdrawSchema)