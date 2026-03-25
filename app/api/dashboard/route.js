import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"
import Deposit from "@/models/Deposit"
import Withdraw from "@/models/Withdraw"
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

function normalizeMoney(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(2))
}

function sumAmounts(items) {
  return normalizeMoney(
    items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  )
}

function buildRequestStats(items) {
  const pending = items.filter((item) => item.status === "pending")
  const success = items.filter((item) => item.status === "success")
  const rejected = items.filter((item) => item.status === "rejected")

  return {
    totalCount: items.length,
    totalAmount: sumAmounts(items),
    pendingCount: pending.length,
    pendingAmount: sumAmounts(pending),
    successCount: success.length,
    successAmount: sumAmounts(success),
    rejectedCount: rejected.length,
    rejectedAmount: sumAmounts(rejected),
  }
}

function inferTransactionStatus(item) {
  const note = String(item.note || "").toLowerCase()
  const type = String(item.type || "").toLowerCase()

  if (note.includes("rejected")) return "rejected"
  if (note.includes("processing")) return "pending"
  if (note.includes("requested")) return "pending"
  if (type === "refund") return "success"

  return "success"
}

function mapTransaction(item) {
  return {
    id: item._id.toString(),
    amount: Number(item.amount || 0),
    type: item.type || "transaction",
    note: item.note || "",
    status: inferTransactionStatus(item),
    createdAt: item.createdAt,
  }
}

function isToday(dateValue) {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return date >= start
}

function getTypeAmount(transactions, types) {
  const typeSet = new Set(types.map((item) => String(item).toLowerCase()))

  return normalizeMoney(
    transactions.reduce((sum, item) => {
      const type = String(item.type || "").toLowerCase()
      return typeSet.has(type) ? sum + Number(item.amount || 0) : sum
    }, 0)
  )
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

    const [user, deposits, withdraws, transactions] = await Promise.all([
      User.findById(auth.id)
        .select("fullName mobile depositBalance withdrawBalance referBonus")
        .lean(),
      Deposit.find({ userId: auth.id }).sort({ createdAt: -1 }).lean(),
      Withdraw.find({ userId: auth.id }).sort({ createdAt: -1 }).lean(),
      Transaction.find({ userId: auth.id }).sort({ createdAt: -1 }).lean(),
    ])

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const depositStats = buildRequestStats(deposits)
    const withdrawStats = buildRequestStats(withdraws)

    const totalTransactions = transactions.length
    const recentActivities = transactions.slice(0, 8).map(mapTransaction)

    const referralBonusAmount = getTypeAmount(transactions, [
      "referral_bonus",
      "refer_bonus",
      "bonus",
    ])

    const refundAmount = getTypeAmount(transactions, ["refund"])
    const sellAmount = getTypeAmount(transactions, ["sell", "sale"])
    const purchaseAmount = getTypeAmount(transactions, ["purchase"])

    const todayTransactions = transactions.filter((item) => isToday(item.createdAt))

    const todayInflow = getTypeAmount(todayTransactions, [
      "deposit",
      "refund",
      "referral_bonus",
      "refer_bonus",
      "bonus",
      "sell",
      "sale",
      "plus",
      "commission",
      "payout",
    ])

    const todayOutflow = getTypeAmount(todayTransactions, [
      "withdraw",
      "purchase",
      "fee",
      "minus",
      "chargeback",
      "subscription",
      "reversal",
    ])

    const todayNetFlow = normalizeMoney(todayInflow - todayOutflow)

    return NextResponse.json(
      {
        user: {
          fullName: user.fullName || "User",
          mobile: user.mobile || "",
          depositBalance: Number(user.depositBalance || 0),
          withdrawBalance: Number(user.withdrawBalance || 0),
          referBonus: Boolean(user.referBonus),
        },
        summary: {
          totalTransactions,
          totalPendingRequests:
            depositStats.pendingCount + withdrawStats.pendingCount,
          totalSuccessRequests:
            depositStats.successCount + withdrawStats.successCount,
          totalRejectedRequests:
            depositStats.rejectedCount + withdrawStats.rejectedCount,

          referralBonusAmount,
          refundAmount,
          sellAmount,
          purchaseAmount,

          todayTransactionCount: todayTransactions.length,
          todayInflow,
          todayOutflow,
          todayNetFlow,
        },
        depositStats,
        withdrawStats,
        recentActivities,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load dashboard data" },
      { status: 500 }
    )
  }
}