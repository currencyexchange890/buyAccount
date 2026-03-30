import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { getAllResourcesLean } from "@/lib/resource-utils"

export async function GET() {
  try {
    await connectDB()

    const resources = await getAllResourcesLean()

    return NextResponse.json(
      {
        resources,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load resources" },
      { status: 500 }
    )
  }
}
