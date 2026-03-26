import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import Withdraw from "@/models/Withdraw"
import User from "@/models/User"
import Transaction from "@/models/Transaction"
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

function normalizeMoney(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(2))
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getWithdrawFeePercent(config) {
  const percent = Number(config?.withdrawFee)
  return Number.isFinite(percent) && percent >= 0 ? percent : 0
}

function getMethodSummary(method, operator) {
  if (method === "bkash") return "bKash"
  if (method === "nagad") return "Nagad"
  if (method === "recharge") {
    const operatorLabelMap = {
      grameenphone: "Grameenphone",
      robi: "Robi",
      airtel: "Airtel",
      teletalk: "Teletalk",
      banglalink: "Banglalink",
    }

    return operator
      ? `Mobile Recharge • ${operatorLabelMap[operator] || operator}`
      : "Mobile Recharge"
  }

  return method || "Unknown"
}

function mapWithdraw(item, feePercent) {
  const user = item.userId || {}
  const amount = Number(item.amount || 0)
  const effectiveFeePercent = item.method === "recharge" ? 0 : feePercent
  const feeAmount = normalizeMoney((amount * effectiveFeePercent) / 100)
  const payableAmount = normalizeMoney(Math.max(amount - feeAmount, 0))

  return {
    id: item._id.toString(),
    name: user.fullName || "Unknown User",
    amount,
    method: item.method || "",
    number: item.number || "",
    status: item.status || "pending",
    feePercent: effectiveFeePercent,
    feeAmount,
    payableAmount,
    operator: item.operator || "",
    methodLabel: getMethodSummary(item.method, item.operator || ""),
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

    const [withdraws, settingsConfig] = await Promise.all([
      Withdraw.find({ status: "pending" })
        .populate({
          path: "userId",
          select: "fullName",
        })
        .sort({ createdAt: -1 })
        .lean(),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
    ])

    const withdrawFeePercent = getWithdrawFeePercent(settingsConfig)

    return NextResponse.json(
      {
        withdrawFeePercent,
        withdraws: withdraws.map((item) => mapWithdraw(item, withdrawFeePercent)),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load pending withdraw requests" },
      { status: 500 }
    )
  }
}

export async function PATCH(req) {
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

    const withdrawId = body.withdrawId?.trim()
    const action = body.action?.trim()

    if (!withdrawId || !mongoose.Types.ObjectId.isValid(withdrawId)) {
      return NextResponse.json(
        { message: "Valid withdraw id is required" },
        { status: 400 }
      )
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      )
    }

    await connectDB()

    const withdraw = await Withdraw.findOne({
      _id: withdrawId,
      status: "pending",
    })

    if (!withdraw) {
      const existingWithdraw = await Withdraw.findById(withdrawId).select("status").lean()

      if (!existingWithdraw) {
        return NextResponse.json(
          { message: "Withdraw request not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { message: `This withdraw request is already ${existingWithdraw.status}` },
        { status: 400 }
      )
    }

    const user = await User.findById(withdraw.userId).select("withdrawBalance")

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const amount = normalizeMoney(withdraw.amount)

    if (action === "reject") {
      user.withdrawBalance = normalizeMoney(
        Number(user.withdrawBalance || 0) + amount
      )

      withdraw.status = "rejected"

      await Promise.all([user.save(), withdraw.save()])

      await Transaction.create({
        userId: user._id,
        amount,
        type: "refund",
        note: withdraw.method === "recharge"
        ? `Your mobile recharge request of BDT ${formatMoney(
            amount
          )} has been rejected and refunded to your withdraw balance.`
        : `Your withdraw request of BDT ${formatMoney(
            amount
          )} has been rejected and refunded to your withdraw balance.`,
      })

      return NextResponse.json(
        {
          message: "Withdraw rejected successfully",
          withdraw: {
            id: withdraw._id.toString(),
            status: withdraw.status,
          },
        },
        { status: 200 }
      )
    }

    withdraw.status = "success"
    await withdraw.save()

    await Transaction.create({
      userId: user._id,
      amount,
      type: "withdraw",
      note: withdraw.method === "recharge"
        ? `Your mobile recharge request of BDT ${formatMoney(
            amount
          )} has been completed successfully.`
        : `Your withdraw request of BDT ${formatMoney(
            amount
          )} has been completed successfully.`,
    })

    return NextResponse.json(
      {
        message: "Withdraw accepted successfully",
        withdraw: {
          id: withdraw._id.toString(),
          status: withdraw.status,
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to process withdraw request" },
      { status: 500 }
    )
  }
}