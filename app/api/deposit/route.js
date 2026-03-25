import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import Deposit from "@/models/Deposit"
import PaymentMethod from "@/models/PaymentMethod"
import SettingsConfig from "@/models/SettingsConfig"
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

function isValidSenderNumber(value) {
  return /^01\d{9}$/.test((value || "").trim())
}

function mapDeposit(item) {
  return {
    id: item._id.toString(),
    amount: item.amount,
    number: item.number,
    method: item.method,
    status: item.status,
    createdAt: item.createdAt,
  }
}

function getMinimumDepositValue(config) {
  const minimumDeposit = Number(config?.minimumDeposit)

  if (!Number.isFinite(minimumDeposit) || minimumDeposit < 1) {
    return 1
  }

  return minimumDeposit
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

function buildDepositTelegramMessage({ fullName, senderNumber, amount, method }) {
  const bdTime = getBangladeshTime()

  return [
    "💸 Deposit Request 💸",
    "",
    `👤 Name: ${fullName}`,
    `📱 Sender: ${senderNumber}`,
    `💰 Amount: ${amount} BDT`,
    `🏦 Method: ${String(method || "").toUpperCase()}`,
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

    const [paymentMethod, settingsConfig, deposits] = await Promise.all([
      PaymentMethod.findOne({ configKey: "main" }).lean(),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
      Deposit.find({ userId: auth.id }).sort({ createdAt: -1 }).lean(),
    ])

    return NextResponse.json(
      {
        paymentNumbers: {
          bkash: paymentMethod?.bkashNumber || "",
          nagad: paymentMethod?.nagadNumber || "",
        },
        minimumDeposit: getMinimumDepositValue(settingsConfig),
        deposits: deposits.map(mapDeposit),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load deposit data" },
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

    await connectDB()

    const [paymentMethod, settingsConfig, user] = await Promise.all([
      PaymentMethod.findOne({ configKey: "main" }).lean(),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
      User.findById(auth.id).select("fullName mobile").lean(),
    ])

    const minimumDeposit = getMinimumDepositValue(settingsConfig)

    if (Number.isNaN(amount) || amount < minimumDeposit || amount > 50000) {
      return NextResponse.json(
        { message: `Amount must be between ${minimumDeposit} and 50000 BDT` },
        { status: 400 }
      )
    }

    if (!["bkash", "nagad"].includes(method)) {
      return NextResponse.json(
        { message: "Invalid payment method" },
        { status: 400 }
      )
    }

    if (!isValidSenderNumber(number)) {
      return NextResponse.json(
        { message: "Sender number must be 11 digits and start with 01" },
        { status: 400 }
      )
    }

    const receiverNumber =
      method === "bkash" ? paymentMethod?.bkashNumber : paymentMethod?.nagadNumber

    if (!receiverNumber) {
      return NextResponse.json(
        { message: "Selected payment method is not configured yet" },
        { status: 400 }
      )
    }

    const deposit = await Deposit.create({
      userId: auth.id,
      amount,
      number,
      method,
      status: "pending",
    })

    const telegramMessage = buildDepositTelegramMessage({
      fullName: user?.fullName || "Unknown User",
      senderNumber: number,
      amount,
      method,
    })

    await sendTelegramMessage(telegramMessage)

    return NextResponse.json(
      {
        message: "Deposit request submitted successfully",
        deposit: mapDeposit(deposit),
      },
      { status: 201 }
    )
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      { message: "Failed to create deposit request" },
      { status: 500 }
    )
  }
}