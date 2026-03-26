import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import ResourcePrice from "@/models/ResourcePrice"

function sortResourcesByPrice(items) {
  return [...items].sort((a, b) => {
    const priceDiff = Number(a?.price || 0) - Number(b?.price || 0)

    if (priceDiff !== 0) {
      return priceDiff
    }

    return String(a?.name || a?.fileName || "").localeCompare(
      String(b?.name || b?.fileName || "")
    )
  })
}

export async function GET() {
  try {
    await connectDB()

    const config = await ResourcePrice.findOne({ configKey: "main" }).lean()

    if (!config || !Array.isArray(config.resources)) {
      return NextResponse.json(
        { resources: [] },
        { status: 200 }
      )
    }

    const resources = sortResourcesByPrice(
      config.resources
        .filter((item) => {
          const hasName = typeof item?.name === "string" && item.name.trim() !== ""
          const hasFileName =
            typeof item?.fileName === "string" && item.fileName.trim() !== ""
          const hasValidPrice = Number.isFinite(Number(item?.price))
          return hasName && hasFileName && hasValidPrice
        })
        .map((item) => ({
          name: item.name.trim(),
          fileName: item.fileName.trim(),
          image: `/image/${encodeURIComponent(item.fileName.trim())}`,
          price: Number(item.price),
        }))
    ).map((item, index) => ({
      id: index + 1,
      ...item,
    }))

    return NextResponse.json(
      { resources },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load resources" },
      { status: 500 }
    )
  }
}
