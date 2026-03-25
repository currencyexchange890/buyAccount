import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import User from "@/models/User"

export async function GET(req) {
  try {
    const token = req.cookies.get("token")?.value

    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    if (typeof payload.id !== "string") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(payload.id)
      .select("fullName role depositBalance withdrawBalance")
      .lean()

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      fullName: user.fullName,
      role: user.role,
      depositBalance: user.depositBalance || 0,
      withdrawBalance: user.withdrawBalance || 0,
    })
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}