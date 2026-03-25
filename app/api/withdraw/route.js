import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Withdraw from "@/models/Withdraw"
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

function isValidMobile(value) {
  return /^01\d{9}$/.test((value || "").trim())
}

function normalizeMoney(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(2))
}

function getSettingsValues(config) {
  const minimumWithdraw = Number(config?.minimumWithdraw)
  const withdrawFee = Number(config?.withdrawFee)

  return {
    minimumWithdrawAmount:
      Number.isFinite(minimumWithdraw) && minimumWithdraw > 0 ? minimumWithdraw : 50,
    withdrawFeePercent:
      Number.isFinite(withdrawFee) && withdrawFee >= 0 ? withdrawFee : 0,
  }
}

function mapWithdraw(item) {
  return {
    id: item._id.toString(),
    method: item.method,
    number: item.number,
    amount: item.amount,
    feePercent: item.feePercent ?? 0,
    feeAmount: item.feeAmount ?? 0,
    payableAmount: item.payableAmount ?? item.amount,
    status: item.status,
    createdAt: item.createdAt,
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
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

function buildWithdrawTelegramMessage({ fullName, amount, method, mobile }) {
  const bdTime = getBangladeshTime()

  return [
    "💵 Withdraw Request 💵",
    "",
    `👤 Name: ${fullName}`,
    `💰 Amount: ${amount} BDT`,
    `🏦 Method: ${String(method || "").toUpperCase()}`,
    `📱 Number: ${mobile}`,
    `🇧🇩 Time: ${bdTime}`,
  ].join("\n")
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

    const [user, config, withdraws] = await Promise.all([
      User.findById(auth.id).select("withdrawBalance").lean(),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
      Withdraw.find({ userId: auth.id }).sort({ createdAt: -1 }).lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const { minimumWithdrawAmount, withdrawFeePercent } = getSettingsValues(config)

    return NextResponse.json(
      {
        minWithdrawAmount: minimumWithdrawAmount,
        withdrawFeePercent,
        withdrawBalance: Number(user.withdrawBalance || 0),
        withdraws: withdraws.map(mapWithdraw),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load withdraw data" },
      { status: 500 }
    )
  }
}

export async function POST(req) {
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
    const body = await req.json()

    const amount = Number(body.amount)
    const method = body.method?.trim()
    const number = body.number?.trim()

    if (!["bkash", "nagad"].includes(method)) {
      return NextResponse.json(
        { message: "Invalid withdraw method" },
        { status: 400 }
      )
    }

    if (!isValidMobile(number)) {
      return NextResponse.json(
        { message: "Number must be 11 digits and start with 01" },
        { status: 400 }
      )
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Please enter a valid amount" },
        { status: 400 }
      )
    }

    await connectDB()

    const [user, config] = await Promise.all([
      User.findById(auth.id).select("fullName withdrawBalance"),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const { minimumWithdrawAmount, withdrawFeePercent } = getSettingsValues(config)

    if (amount < minimumWithdrawAmount) {
      return NextResponse.json(
        {
          message: `Minimum withdraw amount is ৳${formatMoney(minimumWithdrawAmount)}`,
        },
        { status: 400 }
      )
    }

    const currentWithdrawBalance = Number(user.withdrawBalance || 0)

    if (currentWithdrawBalance < minimumWithdrawAmount) {
      return NextResponse.json(
        {
          message: `Your withdraw balance must be at least ৳${formatMoney(
            minimumWithdrawAmount
          )}`,
        },
        { status: 400 }
      )
    }

    if (amount > currentWithdrawBalance) {
      return NextResponse.json(
        { message: "Withdraw amount exceeds your withdraw balance" },
        { status: 400 }
      )
    }

    const feeAmount = normalizeMoney((amount * withdrawFeePercent) / 100)
    const payableAmount = normalizeMoney(Math.max(amount - feeAmount, 0))
    const updatedWithdrawBalance = normalizeMoney(currentWithdrawBalance - amount)

    user.withdrawBalance = updatedWithdrawBalance

    const withdraw = await Withdraw.create({
      userId: auth.id,
      amount,
      feePercent: withdrawFeePercent,
      feeAmount,
      payableAmount,
      number,
      method,
      status: "pending",
    })

    await user.save()

    await Transaction.create({
      userId: auth.id,
      amount,
      type: "withdraw",
      note: `You requested a withdraw of BDT ${formatMoney(
        amount
      )} via ${method === "bkash" ? "bKash" : "Nagad"}. Fee ${withdrawFeePercent}% (BDT ${formatMoney(
        feeAmount
      )}). You will receive BDT ${formatMoney(payableAmount)}.`,
    })

    const telegramMessage = buildWithdrawTelegramMessage({
      fullName: user.fullName || "Unknown User",
      amount,
      method,
      mobile: number,
    })

    await sendTelegramMessage(telegramMessage)

    return NextResponse.json(
      {
        message: `Withdraw request submitted successfully. You will receive ৳${formatMoney(
          payableAmount
        )}`,
        withdraw: mapWithdraw(withdraw),
        withdrawBalance: updatedWithdrawBalance,
      },
      { status: 201 }
    )
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      { message: "Failed to create withdraw request" },
      { status: 500 }
    )
  }
}