import mongoose from "mongoose"

const defaultResources = [
  { name: "Crystal Hammer", fileName: "Crystal Hammer.png", price: 0 },
  { name: "Fire Feather", fileName: "Fire Feather.png", price: 0 },
  { name: "Fire Stone", fileName: "Fire Stone.png", price: 0 },
  { name: "Forest Gem", fileName: "Forest Gem.png", price: 0 },
  { name: "Gold Stack", fileName: "Gold Stack.png", price: 0 },
  { name: "Golden Clam", fileName: "Golden Clam.png", price: 0 },
  { name: "Golden Genie", fileName: "Golden Genie.png", price: 0 },
  { name: "Golden Key", fileName: "Golden Key.png", price: 0 },
  { name: "Lucky Gift", fileName: "Lucky Gift.png", price: 0 },
  { name: "Lunar Stone", fileName: "Lunar Stone.png", price: 0 },
  { name: "Night Elixir", fileName: "Night Elixir.png", price: 0 },
  { name: "Rainbow Potion", fileName: "Rainbow Potion.png", price: 0 },
  { name: "Rainbow Star", fileName: "Rainbow Star.png", price: 0 },
  { name: "Royal Chest", fileName: "Royal Chest.png", price: 0 },
  { name: "Royal Loot", fileName: "Royal Loot.png", price: 0 },
  { name: "Ruby Gem", fileName: "Ruby Gem.png", price: 0 },
  { name: "Ruby Ring", fileName: "Ruby Ring.png", price: 0 },
  { name: "Silver Stack", fileName: "Silver Stack.png", price: 0 },
  { name: "Spell Book", fileName: "Spell Book.png", price: 0 },
  { name: "Titan Hand", fileName: "Titan Hand.png", price: 0 },
  { name: "Treasure Map", fileName: "Treasure Map.png", price: 0 },
]

const ResourceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
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
      default: defaultResources,
    },
  },
  { timestamps: true }
)

export { defaultResources }

export default mongoose.models.ResourcePrice ||
  mongoose.model("ResourcePrice", ResourcePriceSchema)