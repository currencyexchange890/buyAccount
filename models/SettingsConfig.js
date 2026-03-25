import mongoose from "mongoose"

const SettingsConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      default: "main",
      unique: true,
      trim: true,
    },
    dailyWithdrawCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyMaxWithdraw: {
      type: Number,
      default: 0,
      min: 0,
    },
    minimumDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    minimumWithdraw: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    fastReferBonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    regularReferBonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    coolDown: {
      type: Number,
      default: 30,
      min: 1,
    },
    taps: {
      type: Number,
      default: 300,
      min: 1,
    },
  },
  { timestamps: true }
)

export default mongoose.models.SettingsConfig ||
  mongoose.model("SettingsConfig", SettingsConfigSchema)