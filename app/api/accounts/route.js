import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { getAuthUserId } from "@/lib/auth"
import Account from "@/models/Account"

function mapAccount(item) {
  return {
    id: item._id.toString(),
    packageName: item.packageName || "Package",
    username: item.username || "",
    password: item.password || "",
    expireAt: item.expireAt || null,
    createdAt: item.createdAt || null,
  }
}

export async function GET() {
  try {
    const authUserId = await getAuthUserId()

    if (!authUserId) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      )
    }

    await connectDB()

    const now = new Date()

    const accounts = await Account.find({
      ownerId: authUserId,
      expireAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        accounts: accounts.map(mapAccount),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Load accounts error:", error)

    return NextResponse.json(
      { message: "Failed to load accounts" },
      { status: 500 }
    )
  }
}