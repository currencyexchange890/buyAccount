import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import User from "@/models/User"

function clearTokenCookie(response) {
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  })
}

async function verifyAdmin(req) {
  try {
    const token = req.cookies.get("token")?.value

    if (!token || !process.env.JWT_SECRET) {
      return { ok: false }
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    if (typeof payload.id !== "string" || typeof payload.role !== "string") {
      return { ok: false }
    }

    if (payload.role !== "admin") {
      return { ok: false }
    }

    return {
      ok: true,
      userId: payload.id,
      role: payload.role,
    }
  } catch {
    return { ok: false }
  }
}

function mapUser(user) {
  const totalDeposit = Number(user.depositBalance || 0)
  const totalWithdraw = Number(user.withdrawBalance || 0)
  const balance = Math.max(totalDeposit - totalWithdraw, 0)

  return {
    id: user._id.toString(),
    name: user.fullName || "",
    mobile: user.mobile || "",
    role: user.role || "user",
    status: user.status || "inactive",
    balance,
    totalDeposit,
    totalWithdraw,
    joinDate: user.createdAt,
  }
}

export async function GET(req) {
  const auth = await verifyAdmin(req)

  if (!auth.ok) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    await connectDB()

    const users = await User.find({})
      .select("fullName mobile depositBalance withdrawBalance role status createdAt")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        users: users.map(mapUser),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req) {
  const auth = await verifyAdmin(req)

  if (!auth.ok) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    const body = await req.json()

    const userId = body.userId?.trim()
    const nextStatus = body.status?.trim()
    const nextBalance = Number(body.balance)

    if (!userId) {
      return NextResponse.json(
        { message: "User id is required" },
        { status: 400 }
      )
    }

    if (!["active", "inactive"].includes(nextStatus)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      )
    }

    if (Number.isNaN(nextBalance) || nextBalance < 0) {
      return NextResponse.json(
        { message: "Balance must be a valid number" },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findById(userId)

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const currentWithdraw = Number(user.withdrawBalance || 0)

    user.status = nextStatus
    user.depositBalance = currentWithdraw + nextBalance

    await user.save()

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: mapUser(user),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}