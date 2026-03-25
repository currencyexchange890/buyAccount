import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import ResourcePrice from "@/models/ResourcePrice"

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

    const resources = config.resources
      .filter((item) => {
        const hasName = typeof item?.name === "string" && item.name.trim() !== ""
        const hasFileName =
          typeof item?.fileName === "string" && item.fileName.trim() !== ""
        const hasValidPrice = Number.isFinite(Number(item?.price))
        return hasName && hasFileName && hasValidPrice
      })
      .map((item, index) => ({
        id: index + 1,
        name: item.name.trim(),
        fileName: item.fileName.trim(),
        image: `/image/${encodeURIComponent(item.fileName.trim())}`,
        price: Number(item.price),
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