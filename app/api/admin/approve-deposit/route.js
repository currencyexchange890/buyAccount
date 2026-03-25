import mongoose from "mongoose"
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import Deposit from "@/models/Deposit"
import User from "@/models/User"
import SettingsConfig from "@/models/SettingsConfig"
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

  if (!Number.isFinite(number) || number < 0) {
    return 0
  }

  return Number(number.toFixed(2))
}

function normalizePercent(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number) || number < 0) {
    return 0
  }

  return number
}

function getPercentageAmount(amount, percent) {
  return normalizeMoney((Number(amount || 0) * Number(percent || 0)) / 100)
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })
}

function mapDeposit(item) {
  const user = item.userId || {}

  return {
    id: item._id.toString(),
    userId:
      typeof user._id?.toString === "function" ? user._id.toString() : item.userId?.toString?.() || "",
    userName: user.fullName || "Unknown User",
    userMobile: user.mobile || "",
    amount: Number(item.amount || 0),
    method: item.method || "",
    number: item.number || "",
    status: item.status || "pending",
    createdAt: item.createdAt,
    referBonus: Boolean(user.referBonus),
    byRefer:
      typeof user.byRefer?.toString === "function" ? user.byRefer.toString() : "",
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

    const deposits = await Deposit.find({ status: "pending" })
      .populate({
        path: "userId",
        select: "fullName mobile byRefer referBonus",
      })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(
      {
        deposits: deposits.map(mapDeposit),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load pending deposits" },
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

    const depositId = body.depositId?.trim()
    const action = body.action?.trim()

    if (!depositId || !mongoose.Types.ObjectId.isValid(depositId)) {
      return NextResponse.json(
        { message: "Valid deposit id is required" },
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

    const deposit = await Deposit.findOne({
      _id: depositId,
      status: "pending",
    })

    if (!deposit) {
      const existingDeposit = await Deposit.findById(depositId).select("status").lean()

      if (!existingDeposit) {
        return NextResponse.json(
          { message: "Deposit request not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { message: `This deposit is already ${existingDeposit.status}` },
        { status: 400 }
      )
    }

    if (action === "reject") {
      deposit.status = "rejected"
      await deposit.save()

      return NextResponse.json(
        {
          message: "Deposit rejected successfully",
          deposit: {
            id: deposit._id.toString(),
            status: deposit.status,
          },
        },
        { status: 200 }
      )
    }

    const depositor = await User.findById(deposit.userId)

    if (!depositor) {
      return NextResponse.json(
        { message: "Deposit user not found" },
        { status: 404 }
      )
    }

    const settings = await SettingsConfig.findOne({ configKey: "main" }).lean()

    const depositAmount = normalizeMoney(deposit.amount)
    const fastReferBonus = normalizePercent(settings?.fastReferBonus)
    const regularReferBonus = normalizePercent(settings?.regularReferBonus)

    let referrer = null
    let appliedBonusPercent = 0
    let appliedBonusAmount = 0
    let appliedBonusType = ""
    let referrerName = ""

    if (depositor.byRefer) {
      referrer = await User.findById(depositor.byRefer)

      if (referrer) {
        const isFirstReferralBonus = !depositor.referBonus
        appliedBonusPercent = isFirstReferralBonus
          ? fastReferBonus
          : regularReferBonus

        appliedBonusAmount = getPercentageAmount(depositAmount, appliedBonusPercent)
        appliedBonusType = isFirstReferralBonus ? "fast" : "regular"
        referrerName = referrer.fullName || "Unknown User"

        if (appliedBonusAmount > 0) {
          referrer.depositBalance = normalizeMoney(
            Number(referrer.depositBalance || 0) + appliedBonusAmount
          )
        }

        if (!depositor.referBonus) {
          depositor.referBonus = true
        }
      }
    }

    depositor.depositBalance = normalizeMoney(
      Number(depositor.depositBalance || 0) + depositAmount
    )

    deposit.status = "success"

    const transactionDocs = [
      {
        userId: depositor._id,
        amount: depositAmount,
        type: "deposit",
        note: `You have deposited BDT ${formatMoney(depositAmount)}.`,
      },
    ]

    if (referrer && appliedBonusAmount > 0) {
      transactionDocs.push({
        userId: referrer._id,
        amount: appliedBonusAmount,
        type: "referral_bonus",
        note: `You received BDT ${formatMoney(
          appliedBonusAmount
        )} referral bonus for referring ${depositor.fullName || "a user"}.`,
      })
    }

    const saveOperations = [deposit.save(), depositor.save()]

    if (referrer && appliedBonusAmount > 0) {
      saveOperations.push(referrer.save())
    }

    await Promise.all(saveOperations)
    await Transaction.insertMany(transactionDocs)

    const successMessage =
      referrer && appliedBonusAmount > 0
        ? `Deposit accepted successfully. ${referrerName} received BDT ${formatMoney(
            appliedBonusAmount
          )} ${appliedBonusType} referral bonus.`
        : "Deposit accepted successfully. User balance updated."

    return NextResponse.json(
      {
        message: successMessage,
        deposit: {
          id: deposit._id.toString(),
          status: deposit.status,
        },
        meta: {
          depositAmount,
          appliedBonusAmount,
          appliedBonusPercent,
          appliedBonusType,
          referrerName,
          depositorName: depositor.fullName || "Unknown User",
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to process deposit request" },
      { status: 500 }
    )
  }
}