import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import Transaction from "@/models/Transaction"

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

function getAuthUser(req) {
  try {
    const token = req.cookies.get("token")?.value

    if (!token || !process.env.JWT_SECRET) return null

    const payload = jwt.verify(token, process.env.JWT_SECRET)

    if (!payload?.id) return null

    return {
      id: payload.id,
      role: payload.role,
    }
  } catch {
    return null
  }
}

function inferStatusFromType(type) {
  const normalized = String(type || "").toLowerCase()

  if (normalized === "refund") return "success"
  if (normalized === "withdraw") return "success"
  if (normalized === "deposit") return "success"
  if (normalized === "sell") return "success"
  if (normalized === "referral_bonus") return "success"
  if (normalized === "purchase") return "success"

  return "success"
}

function mapTransaction(item) {
  return {
    id: item._id.toString(),
    amount: Number(item.amount || 0),
    type: item.type || "transaction",
    status: item.status || inferStatusFromType(item.type),
    note: item.note || "",
    createdAt: item.createdAt,
  }
}

export async function GET(req) {
  const auth = getAuthUser(req)

  if (!auth) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    await connectDB()

    const transactions = await Transaction.find({ userId: auth.id })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        transactions: transactions.map(mapTransaction),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load transactions" },
      { status: 500 }
    )
  }
}