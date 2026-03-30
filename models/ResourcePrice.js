import mongoose from "mongoose"

const ResourceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fileName: { type: String, default: "", trim: true },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const ResourcePriceSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "main",
      unique: true,
      trim: true,
    },
    resources: {
      type: [ResourceItemSchema],
      default: [],
    },
  },
  { timestamps: true }
)

export default mongoose.models.ResourcePrice ||
  mongoose.model("ResourcePrice", ResourcePriceSchema)
