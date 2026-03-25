import mongoose from "mongoose"

export const PACKAGE_OPTIONS = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Ruby",
  "Diamond",
  "Titanium",
  "Crystal",
  "Master",
  "Grandmaster",
  "Elite",
  "Champion",
  "Hero",
  "Epic",
  "Legend",
]

const PackageResourceSchema = new mongoose.Schema(
  {
    resourceName: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    minQty: { type: Number, required: true, min: 1 },
    maxQty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
)

const PriceListSchema = new mongoose.Schema(
  {
    packageName: {
      type: String,
      required: true,
      enum: PACKAGE_OPTIONS,
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    validityHours: {
      type: Number,
      required: true,
      min: 1,
    },
    packageResources: {
      type: [PackageResourceSchema],
      default: [],
    },
    minResourceValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxResourceValue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
)

export default mongoose.models.PriceList ||
  mongoose.model("PriceList", PriceListSchema)