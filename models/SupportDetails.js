import mongoose from "mongoose"

const SupportDetailsSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "main",
      unique: true,
      trim: true,
    },
    forgotPasswordNumber: {
      type: String,
      default: "",
      trim: true,
    },
    telegramGroupLink: {
      type: String,
      default: "",
      trim: true,
    },
    customerCareLink: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
)

export default mongoose.models.SupportDetails ||
  mongoose.model("SupportDetails", SupportDetailsSchema)