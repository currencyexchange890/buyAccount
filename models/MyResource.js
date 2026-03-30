import mongoose from "mongoose"

const defaultMyResources = []

const MyResourceItemSchema = new mongoose.Schema(
  {
    resourceId: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
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
