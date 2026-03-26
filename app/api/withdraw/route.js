import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Withdraw from "@/models/Withdraw"
import SettingsConfig from "@/models/SettingsConfig"
import Transaction from "@/models/Transaction"

const LIMIT_WINDOW_HOURS = 24
const LIMIT_WINDOW_MS = LIMIT_WINDOW_HOURS * 60 * 60 * 1000

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
  const dailyWithdrawCount = Number(config?.dailyWithdrawCount)
  const dailyMaxWithdraw = Number(config?.dailyMaxWithdraw)

  return {
    minimumWithdrawAmount:
      Number.isFinite(minimumWithdraw) && minimumWithdraw > 0 ? minimumWithdraw : 50,
    withdrawFeePercent:
      Number.isFinite(withdrawFee) && withdrawFee >= 0 ? withdrawFee : 0,
    dailyWithdrawCountLimit:
      Number.isFinite(dailyWithdrawCount) && dailyWithdrawCount > 0 ? dailyWithdrawCount : 0,
    dailyMaxWithdrawLimit:
      Number.isFinite(dailyMaxWithdraw) && dailyMaxWithdraw > 0 ? dailyMaxWithdraw : 0,
  }
}

function mapWithdraw(item) {
  return {
    id: item._id.toString(),
    method: item.method,
    number: item.number,
    amount: Number(item.amount || 0),
    feePercent: Number(item.feePercent || 0),
    feeAmount: Number(item.feeAmount || 0),
    payableAmount: Number(item.payableAmount ?? item.amount ?? 0),
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

function formatDateTime(value) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDuration(ms) {
  const safeMs = Math.max(Number(ms || 0), 0)

  if (!safeMs) {
    return "0m"
  }

  const totalSeconds = Math.ceil(safeMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`
  }

  return `${seconds}s`
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

function getWindowStart() {
  return new Date(Date.now() - LIMIT_WINDOW_MS)
}

function sortWithdrawsAscendingByTime(items) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

function buildUsageStats(recentWithdraws, limits) {
  const usedCount = recentWithdraws.length
  const usedAmount = normalizeMoney(
    recentWithdraws.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  )

  const remainingCount = limits.dailyWithdrawCountLimit
    ? Math.max(limits.dailyWithdrawCountLimit - usedCount, 0)
    : null

  const remainingAmount = limits.dailyMaxWithdrawLimit
    ? normalizeMoney(Math.max(limits.dailyMaxWithdrawLimit - usedAmount, 0))
    : null

  const countUsagePercent = limits.dailyWithdrawCountLimit
    ? Math.min(100, Math.round((usedCount / limits.dailyWithdrawCountLimit) * 100))
    : 0

  const amountUsagePercent = limits.dailyMaxWithdrawLimit
    ? Math.min(100, Math.round((usedAmount / limits.dailyMaxWithdrawLimit) * 100))
    : 0

  return {
    limitWindowHours: LIMIT_WINDOW_HOURS,
    dailyWithdrawCountLimit: limits.dailyWithdrawCountLimit,
    dailyMaxWithdrawLimit: limits.dailyMaxWithdrawLimit,
    last24HourWithdrawCount: usedCount,
    last24HourWithdrawAmount: usedAmount,
    remainingWithdrawCount: remainingCount,
    remainingWithdrawAmount: remainingAmount,
    countUsagePercent,
    amountUsagePercent,
    isCountLimited: limits.dailyWithdrawCountLimit > 0,
    isAmountLimited: limits.dailyMaxWithdrawLimit > 0,
    isCountBlocked: limits.dailyWithdrawCountLimit > 0 && usedCount >= limits.dailyWithdrawCountLimit,
    isAmountBlocked:
      limits.dailyMaxWithdrawLimit > 0 && remainingAmount !== null && remainingAmount <= 0,
  }
}

function getCountRetryAt(recentWithdrawsAsc, countLimit) {
  if (!countLimit || recentWithdrawsAsc.length < countLimit) {
    return null
  }

  const expireCount = recentWithdrawsAsc.length - countLimit + 1
  const pivot = recentWithdrawsAsc[Math.max(expireCount - 1, 0)]

  if (!pivot?.createdAt) {
    return null
  }

  return new Date(new Date(pivot.createdAt).getTime() + LIMIT_WINDOW_MS)
}

function getAmountRetryAt(recentWithdrawsAsc, amountLimit, requestedAmount) {
  if (!amountLimit) {
    return null
  }

  let rollingAmount = normalizeMoney(
    recentWithdrawsAsc.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  )

  if (rollingAmount + requestedAmount <= amountLimit) {
    return null
  }

  for (const item of recentWithdrawsAsc) {
    rollingAmount = normalizeMoney(rollingAmount - Number(item.amount || 0))

    if (rollingAmount + requestedAmount <= amountLimit) {
      return new Date(new Date(item.createdAt).getTime() + LIMIT_WINDOW_MS)
    }
  }

  return recentWithdrawsAsc.length
    ? new Date(new Date(recentWithdrawsAsc[recentWithdrawsAsc.length - 1].createdAt).getTime() + LIMIT_WINDOW_MS)
    : null
}

function buildLimitPayload({ recentWithdraws, limits, requestedAmount = 0 }) {
  const recentWithdrawsAsc = sortWithdrawsAscendingByTime(recentWithdraws)
  const stats = buildUsageStats(recentWithdrawsAsc, limits)

  const countWouldBlock =
    limits.dailyWithdrawCountLimit > 0 &&
    recentWithdrawsAsc.length >= limits.dailyWithdrawCountLimit

  const amountWouldBlock =
    limits.dailyMaxWithdrawLimit > 0 &&
    requestedAmount > 0 &&
    stats.last24HourWithdrawAmount + requestedAmount > limits.dailyMaxWithdrawLimit

  const countRetryAt = countWouldBlock
    ? getCountRetryAt(recentWithdrawsAsc, limits.dailyWithdrawCountLimit)
    : null

  const amountRetryAt = amountWouldBlock
    ? getAmountRetryAt(
        recentWithdrawsAsc,
        limits.dailyMaxWithdrawLimit,
        requestedAmount
      )
    : null

  const blockers = [countRetryAt, amountRetryAt].filter(Boolean)
  const retryAt = blockers.length
    ? new Date(Math.max(...blockers.map((item) => item.getTime())))
    : null

  const retryInMs = retryAt ? Math.max(retryAt.getTime() - Date.now(), 0) : 0
  const retryInText = retryAt ? formatDuration(retryInMs) : ""

  const currentAllowedAmount =
    stats.remainingWithdrawAmount === null ? null : normalizeMoney(stats.remainingWithdrawAmount)

  const amountShortBy =
    limits.dailyMaxWithdrawLimit > 0
      ? normalizeMoney(
          Math.max(
            requestedAmount - (stats.remainingWithdrawAmount || 0),
            0
          )
        )
      : 0

  return {
    limitBlocked: countWouldBlock || amountWouldBlock,
    limitType:
      countWouldBlock && amountWouldBlock
        ? "count_and_amount"
        : countWouldBlock
        ? "count"
        : amountWouldBlock
        ? "amount"
        : "",
    retryAt: retryAt ? retryAt.toISOString() : null,
    retryAtText: retryAt ? formatDateTime(retryAt) : "",
    retryInMs,
    retryInText,
    currentAllowedAmount,
    amountShortBy,
    stats,
    countWouldBlock,
    amountWouldBlock,
  }
}

function buildAvailabilityPayload(recentWithdraws, limits) {
  const stats = buildUsageStats(recentWithdraws, limits)
  const countRetryAt = stats.isCountBlocked
    ? getCountRetryAt(sortWithdrawsAscendingByTime(recentWithdraws), limits.dailyWithdrawCountLimit)
    : null
  const amountRetryAt = stats.isAmountBlocked
    ? getAmountRetryAt(
        sortWithdrawsAscendingByTime(recentWithdraws),
        limits.dailyMaxWithdrawLimit,
        1
      )
    : null

  const blockers = [countRetryAt, amountRetryAt].filter(Boolean)
  const retryAt = blockers.length
    ? new Date(Math.max(...blockers.map((item) => item.getTime())))
    : null

  return {
    ...stats,
    canWithdrawNow: !stats.isCountBlocked && !stats.isAmountBlocked,
    retryAt: retryAt ? retryAt.toISOString() : null,
    retryAtText: retryAt ? formatDateTime(retryAt) : "",
    retryInMs: retryAt ? Math.max(retryAt.getTime() - Date.now(), 0) : 0,
    retryInText: retryAt ? formatDuration(Math.max(retryAt.getTime() - Date.now(), 0)) : "",
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

    const [user, config, withdraws, recentWithdraws] = await Promise.all([
      User.findById(auth.id).select("withdrawBalance").lean(),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
      Withdraw.find({ userId: auth.id }).sort({ createdAt: -1 }).lean(),
      Withdraw.find({
        userId: auth.id,
        createdAt: { $gte: getWindowStart() },
      })
        .sort({ createdAt: 1 })
        .lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const limits = getSettingsValues(config)
    const limitStats = buildAvailabilityPayload(recentWithdraws, limits)

    return NextResponse.json(
      {
        minWithdrawAmount: limits.minimumWithdrawAmount,
        withdrawFeePercent: limits.withdrawFeePercent,
        withdrawBalance: Number(user.withdrawBalance || 0),
        withdraws: withdraws.map(mapWithdraw),
        limitStats,
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

    const [user, config, recentWithdraws] = await Promise.all([
      User.findById(auth.id).select("fullName withdrawBalance"),
      SettingsConfig.findOne({ configKey: "main" }).lean(),
      Withdraw.find({
        userId: auth.id,
        createdAt: { $gte: getWindowStart() },
      })
        .sort({ createdAt: 1 })
        .lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const limits = getSettingsValues(config)

    if (amount < limits.minimumWithdrawAmount) {
      return NextResponse.json(
        {
          message: `Minimum withdraw amount is ৳${formatMoney(limits.minimumWithdrawAmount)}`,
        },
        { status: 400 }
      )
    }

    const currentWithdrawBalance = Number(user.withdrawBalance || 0)

    if (currentWithdrawBalance < limits.minimumWithdrawAmount) {
      return NextResponse.json(
        {
          message: `Your withdraw balance must be at least ৳${formatMoney(
            limits.minimumWithdrawAmount
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

    const limitCheck = buildLimitPayload({
      recentWithdraws,
      limits,
      requestedAmount: amount,
    })

    if (limitCheck.limitBlocked) {
      const stats = limitCheck.stats
      const message = buildLimitMessage(limitCheck, amount)

      return NextResponse.json(
        {
          message,
          limitBlocked: true,
          limitType: limitCheck.limitType,
          retryAt: limitCheck.retryAt,
          retryAtText: limitCheck.retryAtText,
          retryInMs: limitCheck.retryInMs,
          retryInText: limitCheck.retryInText,
          limitStats: {
            ...stats,
            canWithdrawNow: !stats.isCountBlocked && !stats.isAmountBlocked,
          },
          limitModal: {
            type: limitCheck.limitType,
            requestedAmount: amount,
            retryAt: limitCheck.retryAt,
            retryAtText: limitCheck.retryAtText,
            retryInMs: limitCheck.retryInMs,
            retryInText: limitCheck.retryInText,
            currentAllowedAmount: limitCheck.currentAllowedAmount,
            amountShortBy: limitCheck.amountShortBy,
            countWouldBlock: limitCheck.countWouldBlock,
            amountWouldBlock: limitCheck.amountWouldBlock,
            dailyWithdrawCountLimit: stats.dailyWithdrawCountLimit,
            dailyMaxWithdrawLimit: stats.dailyMaxWithdrawLimit,
            last24HourWithdrawCount: stats.last24HourWithdrawCount,
            last24HourWithdrawAmount: stats.last24HourWithdrawAmount,
            remainingWithdrawCount: stats.remainingWithdrawCount,
            remainingWithdrawAmount: stats.remainingWithdrawAmount,
          },
        },
        { status: 429 }
      )
    }

    const feeAmount = normalizeMoney((amount * limits.withdrawFeePercent) / 100)
    const payableAmount = normalizeMoney(Math.max(amount - feeAmount, 0))
    const updatedWithdrawBalance = normalizeMoney(currentWithdrawBalance - amount)

    user.withdrawBalance = updatedWithdrawBalance

    const withdraw = await Withdraw.create({
      userId: auth.id,
      amount,
      feePercent: limits.withdrawFeePercent,
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
      )} via ${method === "bkash" ? "bKash" : "Nagad"}. Fee ${limits.withdrawFeePercent}% (BDT ${formatMoney(
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

    const nextLimitStats = buildAvailabilityPayload(
      [...recentWithdraws, withdraw.toObject()],
      limits
    )

    return NextResponse.json(
      {
        message: `Withdraw request submitted successfully. You will receive ৳${formatMoney(
          payableAmount
        )}`,
        withdraw: mapWithdraw(withdraw),
        withdrawBalance: updatedWithdrawBalance,
        limitStats: nextLimitStats,
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

function buildLimitMessage(limitCheck, requestedAmount) {
  const stats = limitCheck.stats

  if (limitCheck.limitType === "count") {
    return `You already used ${stats.last24HourWithdrawCount}/${stats.dailyWithdrawCountLimit} withdraw requests in the last ${LIMIT_WINDOW_HOURS} hours. Try again after ${limitCheck.retryInText || "some time"}.`
  }

  if (limitCheck.limitType === "amount") {
    if ((limitCheck.currentAllowedAmount || 0) > 0) {
      return `Your requested amount exceeds the last ${LIMIT_WINDOW_HOURS}-hour withdraw limit. You can withdraw up to ৳${formatMoney(
        limitCheck.currentAllowedAmount
      )} now, or try ৳${formatMoney(requestedAmount)} after ${limitCheck.retryInText || "some time"}.`
    }

    return `You already used ৳${formatMoney(
      stats.last24HourWithdrawAmount
    )} of your ৳${formatMoney(
      stats.dailyMaxWithdrawLimit
    )} limit in the last ${LIMIT_WINDOW_HOURS} hours. Try again after ${limitCheck.retryInText || "some time"}.`
  }

  return `Your request crosses both the request count and amount limit for the last ${LIMIT_WINDOW_HOURS} hours. Try again after ${limitCheck.retryInText || "some time"}.`
}
