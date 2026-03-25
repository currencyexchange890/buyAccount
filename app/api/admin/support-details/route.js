import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import SupportDetails from "@/models/SupportDetails"

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

function isValidMobile(value) {
  return /^01\d{9}$/.test((value || "").trim())
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

    const support = await SupportDetails.findOne({ configKey: "main" }).lean()

    return NextResponse.json(
      {
        exists: !!support,
        forgotPasswordNumber: support?.forgotPasswordNumber || "",
        telegramGroupLink: support?.telegramGroupLink || "",
        customerCareLink: support?.customerCareLink || "",
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

export async function POST(req) {
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

    const forgotPasswordNumber = body.forgotPasswordNumber?.trim() || ""
    const telegramGroupLink = body.telegramGroupLink?.trim() || ""
    const customerCareLink = body.customerCareLink?.trim() || ""

    if (!isValidMobile(forgotPasswordNumber)) {
      return NextResponse.json(
        { message: "Forgot password number must start with 01 and be 11 digits" },
        { status: 400 }
      )
    }

    await connectDB()

    const support = await SupportDetails.findOneAndUpdate(
      { configKey: "main" },
      {
        forgotPasswordNumber,
        telegramGroupLink,
        customerCareLink,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    )

    return NextResponse.json(
      {
        message: "Support setup saved successfully",
        exists: true,
        forgotPasswordNumber: support.forgotPasswordNumber,
        telegramGroupLink: support.telegramGroupLink,
        customerCareLink: support.customerCareLink,
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