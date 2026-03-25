import mongoose from "mongoose"

const TransactionSchema = new mongoose.Schema(
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
      min: 0,
    },
    type: {
      type: String,
      enum: ["deposit", "withdraw", "referral_bonus", "purchase", "sell", "refund"],
      required: true,
      trim: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema)