import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import SettingsConfig from "@/models/SettingsConfig"

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

    const config = await SettingsConfig.findOne({ configKey: "main" }).lean()

    return NextResponse.json(
      {
        exists: !!config,
        dailyWithdrawCount: config?.dailyWithdrawCount ?? 0,
        dailyMaxWithdraw: config?.dailyMaxWithdraw ?? 0,
        minimumDeposit: config?.minimumDeposit ?? 0,
        minimumWithdraw: config?.minimumWithdraw ?? 0,
        withdrawFee: config?.withdrawFee ?? 0,
        fastReferBonus: config?.fastReferBonus ?? 0,
        regularReferBonus: config?.regularReferBonus ?? 0,
        coolDown: config?.coolDown ?? 30,
        taps: config?.taps ?? 300,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
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

    const dailyWithdrawCount = Number(body.dailyWithdrawCount)
    const dailyMaxWithdraw = Number(body.dailyMaxWithdraw)
    const minimumDeposit = Number(body.minimumDeposit)
    const minimumWithdraw = Number(body.minimumWithdraw)
    const withdrawFee = Number(body.withdrawFee)
    const fastReferBonus = Number(body.fastReferBonus)
    const regularReferBonus = Number(body.regularReferBonus)
    const coolDown = Number(body.coolDown)
    const taps = Number(body.taps)

    if (Number.isNaN(dailyWithdrawCount) || dailyWithdrawCount < 0) {
      return NextResponse.json(
        { message: "Daily withdraw count must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(dailyMaxWithdraw) || dailyMaxWithdraw < 0) {
      return NextResponse.json(
        { message: "Daily max withdraw must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(minimumDeposit) || minimumDeposit < 0) {
      return NextResponse.json(
        { message: "Minimum deposit must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(minimumWithdraw) || minimumWithdraw < 0) {
      return NextResponse.json(
        { message: "Minimum withdraw must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(withdrawFee) || withdrawFee < 0) {
      return NextResponse.json(
        { message: "Withdraw fee must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(fastReferBonus) || fastReferBonus < 0) {
      return NextResponse.json(
        { message: "Fast refer bonus must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(regularReferBonus) || regularReferBonus < 0) {
      return NextResponse.json(
        { message: "Regular refer bonus must be a valid number" },
        { status: 400 }
      )
    }

    if (Number.isNaN(coolDown) || coolDown <= 0) {
      return NextResponse.json(
        { message: "Cool down must be greater than 0" },
        { status: 400 }
      )
    }

    if (Number.isNaN(taps) || taps <= 0) {
      return NextResponse.json(
        { message: "Taps must be greater than 0" },
        { status: 400 }
      )
    }

    await connectDB()

    const saved = await SettingsConfig.findOneAndUpdate(
      { configKey: "main" },
      {
        dailyWithdrawCount,
        dailyMaxWithdraw,
        minimumDeposit,
        minimumWithdraw,
        withdrawFee,
        fastReferBonus,
        regularReferBonus,
        coolDown,
        taps,
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
        message: "Settings configuration saved successfully",
        exists: true,
        dailyWithdrawCount: saved.dailyWithdrawCount,
        dailyMaxWithdraw: saved.dailyMaxWithdraw,
        minimumDeposit: saved.minimumDeposit,
        minimumWithdraw: saved.minimumWithdraw,
        withdrawFee: saved.withdrawFee,
        fastReferBonus: saved.fastReferBonus,
        regularReferBonus: saved.regularReferBonus,
        coolDown: saved.coolDown,
        taps: saved.taps,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}