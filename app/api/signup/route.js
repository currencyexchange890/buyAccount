import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"

function getNamePrefix(fullName) {
  const letters = (fullName || "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()

  if (letters.length >= 4) return letters.slice(0, 4)
  if (letters.length >= 3) return letters.slice(0, 3)
  if (letters.length >= 2) return letters.slice(0, 2)
  return "USR"
}

async function generateUniqueReferCode(fullName, mobile) {
  const prefix = getNamePrefix(fullName)

  const suffixCandidates = [
    mobile.slice(-2),
    mobile.slice(7, 9),
    mobile.slice(6, 8),
    mobile.slice(5, 7),
    mobile.slice(4, 6),
    mobile.slice(3, 5),
  ]

  for (const suffix of suffixCandidates) {
    const code = `${prefix}${suffix}`.toUpperCase()
    const exists = await User.findOne({ myReferCode: code }).lean()
    if (!exists) return code
  }

  let count = 10
  while (true) {
    const code = `${prefix}${count}`.toUpperCase()
    const exists = await User.findOne({ myReferCode: code }).lean()
    if (!exists) return code
    count++
  }
}

function getBangladeshTime() {
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date())
}

function buildTelegramMessage({ fullName, mobile }) {
  const bdTime = getBangladeshTime()


return "🌸✨ Welcome New User ✨🌸\n\n" +
"👤 " + fullName + "\n" +
"📱 " + mobile + "\n" +
"🇧🇩 " + bdTime + "\n\n" +
"🎉 Enjoy the journey!";
}

async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.log("Telegram config missing")
    return
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
      cache: "no-store",
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.log("Telegram send failed:", data)
    }
  } catch (error) {
    console.log("Telegram error:", error)
  }
}

export async function POST(req) {
  try {
    const body = await req.json()

    const fullName = body.fullName?.trim()
    const mobile = body.mobile?.trim()
    const password = body.password || ""
    const referCode = body.referCode?.trim().toUpperCase()

    if (!fullName || fullName.length < 3) {
      return NextResponse.json(
        { message: "Full name must be at least 3 characters long" },
        { status: 400 }
      )
    }

    if (!/^01\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { message: "Mobile number must be 11 digits and start with 01" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    await connectDB()

    const exists = await User.findOne({ mobile })
    if (exists) {
      return NextResponse.json(
        { message: "An account with this mobile number already exists" },
        { status: 409 }
      )
    }

    let referredBy = null

    if (referCode) {
      const refUser = await User.findOne({ myReferCode: referCode })
      if (refUser) {
        referredBy = refUser._id
      }
    }

    const myReferCode = await generateUniqueReferCode(fullName, mobile)

    const user = await User.create({
      fullName,
      mobile,
      password,
      byRefer: referredBy,
      myReferCode,
      myReferList: [],
      referBonus: false,
      role: "user",
      status: "active",
    })

    if (referredBy) {
      await User.findByIdAndUpdate(referredBy, {
        $addToSet: { myReferList: user._id },
      })
    }

    const telegramMessage = buildTelegramMessage({
      fullName: user.fullName,
      mobile: user.mobile,
    })

    await sendTelegramMessage(telegramMessage)

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1y",
      }
    )

    const response = NextResponse.json(
      {
        message: "Account created successfully",
        myReferCode: user.myReferCode,
      },
      { status: 201 }
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
    console.log(error)

    return NextResponse.json(
      { message: "Server error occurred" },
      { status: 500 }
    )
  }
}