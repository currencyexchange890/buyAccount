import mongoose from "mongoose"
import { defaultResources } from "@/models/ResourcePrice"

const defaultMyResources = defaultResources.map((item) => ({
  name: item.name,
  stock: 0,
}))

const MyResourceItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
)

const MyResourceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    resources: {
      type: [MyResourceItemSchema],
      default: defaultMyResources,
    },
  },
  { timestamps: true }
)

export { defaultMyResources }

export default mongoose.models.MyResource ||
  mongoose.model("MyResource", MyResourceSchema)