"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineCash,
  HiOutlineCreditCard,
  HiOutlineCollection,
  HiOutlineClock,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCurrencyBangladeshi,
  HiOutlineRefresh,
  HiOutlineXCircle,
  HiOutlineGift,
  HiOutlineReply,
  HiOutlineShoppingCart,
  HiOutlineUser,
} from "react-icons/hi"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      try {
        setLoading(true)

        const res = await fetch("/api/dashboard", {
          method: "GET",
          cache: "no-store",
        })

        const result = await res.json()

        if (res.status === 401) {
          toast.error(result?.message || "Unauthorized access")
          router.replace("/users/login")
          router.refresh()
          return
        }

        if (!res.ok) {
          throw new Error(result?.message || "Failed to load dashboard")
        }

        if (!ignore) {
          setData(result)
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load dashboard")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      ignore = true
    }
  }, [router])

  const stats = useMemo(() => {
    if (!data) return []

    return [
      {
        title: "Withdraw Balance",
        value: `৳${formatMoney(data.user?.withdrawBalance)}`,
        sub: "Available to withdraw",
        Icon: HiOutlineCash,
      },
      {
        title: "Deposit Balance",
        value: `৳${formatMoney(data.user?.depositBalance)}`,
        sub: "Current deposit balance",
        Icon: HiOutlineCreditCard,
      },
      {
        title: "Transactions",
        value: data.summary?.totalTransactions || 0,
        sub: "All records",
        Icon: HiOutlineCollection,
      },
      {
        title: "Today Activity",
        value: data.summary?.todayTransactionCount || 0,
        sub: "Today records",
        Icon: HiOutlineClock,
      },
      {
        title: "Deposit Requests",
        value: data.depositStats?.totalCount || 0,
        sub: "All deposit requests",
        Icon: HiOutlineCurrencyBangladeshi,
      },
      {
        title: "Withdraw Requests",
        value: data.withdrawStats?.totalCount || 0,
        sub: "All withdraw requests",
        Icon: HiOutlineTrendingDown,
      },
      {
        title: "Deposited Amount",
        value: `৳${formatMoney(data.depositStats?.totalAmount)}`,
        sub: "Total requested deposit",
        Icon: HiOutlineTrendingUp,
      },
      {
        title: "Withdraw Amount",
        value: `৳${formatMoney(data.withdrawStats?.totalAmount)}`,
        sub: "Total requested withdraw",
        Icon: HiOutlineTrendingDown,
      },
      {
        title: "Pending Requests",
        value: data.summary?.totalPendingRequests || 0,
        sub: "Waiting for review",
        Icon: HiOutlineExclamationCircle,
      },
      {
        title: "Success Requests",
        value: data.summary?.totalSuccessRequests || 0,
        sub: "Completed requests",
        Icon: HiOutlineCheckCircle,
      },
      {
        title: "Rejected Requests",
        value: data.summary?.totalRejectedRequests || 0,
        sub: "Rejected requests",
        Icon: HiOutlineXCircle,
      },
      {
        title: "Referral Bonus",
        value: `৳${formatMoney(data.summary?.referralBonusAmount)}`,
        sub: "Earned bonus",
        Icon: HiOutlineGift,
      },
      {
        title: "Refund Amount",
        value: `৳${formatMoney(data.summary?.refundAmount)}`,
        sub: "Returned amount",
        Icon: HiOutlineReply,
      },
      {
        title: "Sell Amount",
        value: `৳${formatMoney(data.summary?.sellAmount)}`,
        sub: "Resource sell total",
        Icon: HiOutlineTrendingUp,
      },
      {
        title: "Purchase Amount",
        value: `৳${formatMoney(data.summary?.purchaseAmount)}`,
        sub: "Purchase total",
        Icon: HiOutlineShoppingCart,
      },
      {
        title: "Today Net Flow",
        value: `৳${formatMoney(data.summary?.todayNetFlow)}`,
        sub: "Inflow - outflow",
        Icon: HiOutlineRefresh,
      },
    ]
  }, [data])

  return (
    <main className="min-h-screen bg-[#081120] px-3 py-5 text-white sm:px-4">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0f1a33",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.1)",
          },
        }}
      />

      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-3 py-1 text-[11px] font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            DASHBOARD
          </div>
        </div>

        <section
          className="rounded-[24px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: formShadow }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] text-white/45">Quick overview of your account</p>
              <h1 className="mt-1 text-2xl font-semibold">
                My <span className="text-[#60a5fa]">Dashboard</span>
              </h1>
              <p className="mt-2 text-sm text-white/55">
                See your balances, requests, money flow and latest activity in one place.
              </p>
            </div>

            <div
              className="rounded-[18px] border border-white/10 bg-[#0f1a33] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-[#101d38] text-[#60a5fa]"
                  style={{ boxShadow: fieldShadow }}
                >
                  <HiOutlineUser className="text-lg" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {loading ? "Loading..." : data?.user?.fullName || "User"}
                  </p>
                  <p className="text-[11px] text-white/45">
                    {loading ? "Please wait" : data?.user?.mobile || "No mobile"}
                  </p>
                </div>
              </div>

              {!loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#13203e] px-3 py-1 text-[11px] font-semibold text-[#60a5fa]">
                    Withdraw ৳{formatMoney(data?.user?.withdrawBalance)}
                  </span>
                  <span className="rounded-full bg-[#1f2a19] px-3 py-1 text-[11px] font-semibold text-[#86efac]">
                    {data?.user?.referBonus ? "Referral Bonus Active" : "No Referral Bonus Yet"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[16px] border border-white/10 bg-[#0f1a33] p-2.5"
                    style={{ boxShadow: fieldShadow }}
                  >
                    <div className="h-20 animate-pulse rounded-xl bg-white/5" />
                  </div>
                ))
              : stats.map(({ title, value, sub, Icon }) => (
                  <div
                    key={title}
                    className="rounded-[16px] border border-white/10 bg-[#0f1a33] p-2.5"
                    style={{ boxShadow: fieldShadow }}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] leading-[1.2] text-white/55">{title}</p>
                      </div>

                      <div
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#101d38] text-[#60a5fa]"
                        style={{ boxShadow: fieldShadow }}
                      >
                        <Icon className="text-sm" />
                      </div>
                    </div>

                    <p className="break-words text-[15px] font-extrabold leading-tight text-white">
                      {value}
                    </p>
                    <p className="mt-1 text-[10px] leading-tight text-[#93c5fd]">{sub}</p>
                  </div>
                ))}
          </div>
        </section>

        <section
          className="mt-4 rounded-[24px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: formShadow }}
        >
          <div className="mb-4">
            <p className="text-[11px] text-white/45">Request analysis</p>
            <h2 className="mt-1 text-xl font-semibold">
              Request <span className="text-[#60a5fa]">Overview</span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[18px] border border-white/10 bg-[#0f1a33] p-4"
                  style={{ boxShadow: fieldShadow }}
                >
                  <div className="h-24 animate-pulse rounded-xl bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <SummaryCard
                title="Deposit Summary"
                tone="blue"
                totalCount={data?.depositStats?.totalCount}
                totalAmount={data?.depositStats?.totalAmount}
                pendingCount={data?.depositStats?.pendingCount}
                successCount={data?.depositStats?.successCount}
                rejectedCount={data?.depositStats?.rejectedCount}
              />

              <SummaryCard
                title="Withdraw Summary"
                tone="amber"
                totalCount={data?.withdrawStats?.totalCount}
                totalAmount={data?.withdrawStats?.totalAmount}
                pendingCount={data?.withdrawStats?.pendingCount}
                successCount={data?.withdrawStats?.successCount}
                rejectedCount={data?.withdrawStats?.rejectedCount}
              />

              <FlowCard
                todayInflow={data?.summary?.todayInflow}
                todayOutflow={data?.summary?.todayOutflow}
                todayNetFlow={data?.summary?.todayNetFlow}
              />
            </div>
          )}
        </section>

        <section
          className="mt-4 rounded-[24px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: formShadow }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-white/45">Latest user activity</p>
              <h2 className="mt-1 text-xl font-semibold">
                Recent <span className="text-[#60a5fa]">Activity</span>
              </h2>
            </div>

            {!loading && (
              <div className="rounded-full bg-[#13203e] px-3 py-1 text-[11px] font-semibold text-[#60a5fa]">
                {data?.recentActivities?.length || 0} items
              </div>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
                  style={{ boxShadow: fieldShadow }}
                >
                  <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                </div>
              ))
            ) : !data?.recentActivities?.length ? (
              <div
                className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/55"
                style={{ boxShadow: fieldShadow }}
              >
                No recent activity found.
              </div>
            ) : (
              data.recentActivities.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
                  style={{ boxShadow: fieldShadow }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          ৳{formatMoney(item.amount)}
                        </p>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <p className="text-sm font-medium text-[#93c5fd]">
                          {prettyType(item.type)}
                        </p>
                      </div>

                      {item.note && (
                        <p className="mt-2 text-xs leading-relaxed text-white/60">
                          <NoteWithHighlights text={item.note} />
                        </p>
                      )}

                      <p className="mt-2 text-[11px] text-white/35">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>

                    <StatusPill status={item.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryCard({
  title,
  tone,
  totalCount,
  totalAmount,
  pendingCount,
  successCount,
  rejectedCount,
}) {
  const toneClass =
    tone === "amber"
      ? "text-[#facc15]"
      : tone === "rose"
      ? "text-[#fda4af]"
      : "text-[#60a5fa]"

  return (
    <div
      className="rounded-[18px] border border-white/10 bg-[#0f1a33] p-4"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">{title}</p>
      <p className={`mt-2 text-xl font-extrabold ${toneClass}`}>
        ৳{formatMoney(totalAmount)}
      </p>
      <p className="mt-1 text-sm text-white/55">{totalCount || 0} total requests</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <TinyStat label="Pending" value={pendingCount || 0} tone="amber" />
        <TinyStat label="Success" value={successCount || 0} tone="blue" />
        <TinyStat label="Rejected" value={rejectedCount || 0} tone="rose" />
      </div>
    </div>
  )
}

function FlowCard({ todayInflow, todayOutflow, todayNetFlow }) {
  return (
    <div
      className="rounded-[18px] border border-white/10 bg-[#0f1a33] p-4"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
        Today Cash Flow
      </p>

      <div className="mt-3 space-y-2">
        <FlowRow label="Inflow" value={todayInflow} tone="green" />
        <FlowRow label="Outflow" value={todayOutflow} tone="amber" />
        <FlowRow label="Net Flow" value={todayNetFlow} tone="blue" />
      </div>
    </div>
  )
}

function FlowRow({ label, value, tone }) {
  const color =
    tone === "green"
      ? "text-[#86efac]"
      : tone === "amber"
      ? "text-[#facc15]"
      : "text-[#60a5fa]"

  return (
    <div
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#101d38] px-3 py-2.5"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-sm text-white/70">{label}</p>
      <p className={`text-sm font-bold ${color}`}>৳{formatMoney(value)}</p>
    </div>
  )
}

function TinyStat({ label, value, tone }) {
  const color =
    tone === "amber"
      ? "text-[#facc15]"
      : tone === "rose"
      ? "text-[#fda4af]"
      : "text-[#93c5fd]"

  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#101d38] px-2 py-2 text-center"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-[10px] text-white/40">{label}</p>
      <p className={`mt-1 text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}

function StatusPill({ status }) {
  const s = String(status || "success").toLowerCase()

  const cls =
    s === "pending"
      ? "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#fcd34d]"
      : s === "rejected"
      ? "border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]"
      : "border-[#60a5fa]/25 bg-[#3b82f6]/10 text-[#93c5fd]"

  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold ${cls}`}>
      {capitalize(s)}
    </span>
  )
}

function prettyType(type) {
  return (
    {
      deposit: "Deposit",
      withdraw: "Withdraw",
      purchase: "Purchase",
      refund: "Refund",
      transfer: "Transfer",
      sale: "Sale",
      sell: "Sell",
      fee: "Fee",
      plus: "Plus",
      minus: "Minus",
      bonus: "Bonus",
      refer_bonus: "Refer Bonus",
      referral_bonus: "Referral Bonus",
      chargeback: "Chargeback",
      adjustment: "Adjustment",
      subscription: "Subscription",
      commission: "Commission",
      payout: "Payout",
      reversal: "Reversal",
    }[String(type).toLowerCase()] || "Transaction"
  )
}

function NoteWithHighlights({ text }) {
  return splitWithAmounts(String(text)).map((part, i) =>
    part.kind === "amt" ? (
      <span
        key={i}
        className="whitespace-nowrap rounded-[10px] border border-[#60a5fa]/25 bg-[#3b82f6]/10 px-2 py-0.5 font-semibold text-[#93c5fd]"
      >
        {part.value}
      </span>
    ) : (
      <span key={i} className="text-white/60">
        {part.value}
      </span>
    )
  )
}

function splitWithAmounts(text) {
  const out = []
  const rx = /(৳\s*\d+(?:[.,]\d+)?|\b\d+(?:[.,]\d+)?\s*(?:tk|taka|bdt)\b|\b\d+(?:[.,]\d+)?\b)/gi
  let last = 0
  let match

  while ((match = rx.exec(text))) {
    const start = match.index
    if (start > last) out.push({ kind: "txt", value: text.slice(last, start) })
    out.push({ kind: "amt", value: match[0] })
    last = start + match[0].length
  }

  if (last < text.length) out.push({ kind: "txt", value: text.slice(last) })
  return out.length ? out : [{ kind: "txt", value: text }]
}

function formatDate(value) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function capitalize(value) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}