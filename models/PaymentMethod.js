import mongoose from "mongoose"

const PaymentMethodSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "main",
      unique: true,
      trim: true,
    },
    bkashNumber: {
      type: String,
      required: true,
      trim: true,
    },
    nagadNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

export default mongoose.models.PaymentMethod ||
  mongoose.model("PaymentMethod", PaymentMethodSchema)