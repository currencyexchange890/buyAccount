import mongoose from "mongoose"

const DepositSchema = new mongoose.Schema(
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
      max: 50000,
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

export default mongoose.models.Deposit || mongoose.model("Deposit", DepositSchema)