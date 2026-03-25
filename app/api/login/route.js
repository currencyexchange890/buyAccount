import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"

export async function POST(req) {
  try {
    const body = await req.json()

    const mobile = body.mobile?.trim()
    const password = body.password || ""

    if (!/^01\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { message: "মোবাইল নাম্বার ঠিক নয়" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "পাসওয়ার্ড ঠিক নয়" },
        { status: 400 }
      )
    }

    await connectDB()

    const user = await User.findOne({ mobile })

    if (!user) {
      return NextResponse.json(
        { message: "একাউন্ট পাওয়া যায়নি" },
        { status: 404 }
      )
    }

    // যদি plain password store করে থাকো
    if (user.password !== password) {
      return NextResponse.json(
        { message: "পাসওয়ার্ড ভুল" },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1y",
      }
    )

    const response = NextResponse.json(
      { message: "লগইন সফল" },
      { status: 200 }
    )

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { message: "সার্ভার এরর" },
      { status: 500 }
    )
  }
}