"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import { HiOutlinePhone, HiArrowUp, HiOutlineX, HiOutlineClock } from "react-icons/hi"

const methods = [
  { key: "bkash", label: "bKash" },
  { key: "nagad", label: "Nagad" },
]

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

const defaultLimitStats = {
  limitWindowHours: 24,
  dailyWithdrawCountLimit: 0,
  dailyMaxWithdrawLimit: 0,
  last24HourWithdrawCount: 0,
  last24HourWithdrawAmount: 0,
  remainingWithdrawCount: null,
  remainingWithdrawAmount: null,
  countUsagePercent: 0,
  amountUsagePercent: 0,
  isCountLimited: false,
  isAmountLimited: false,
  isCountBlocked: false,
  isAmountBlocked: false,
  canWithdrawNow: true,
  retryAt: null,
  retryAtText: "",
  retryInMs: 0,
  retryInText: "",
}

export default function WithdrawPage() {
  const router = useRouter()

  const [method, setMethod] = useState("bkash")
  const [number, setNumber] = useState("")
  const [amount, setAmount] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState([])
  const [withdrawBalance, setWithdrawBalance] = useState(0)
  const [minWithdraw, setMinWithdraw] = useState(50)
  const [withdrawFeePercent, setWithdrawFeePercent] = useState(0)
  const [limitStats, setLimitStats] = useState(defaultLimitStats)
  const [limitModal, setLimitModal] = useState(null)
  const [countdown, setCountdown] = useState("")

  const nAmount = useMemo(() => {
    const n = Number(String(amount).replace(/\D/g, ""))
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }, [amount])

  const validNumber = /^01\d{9}$/.test(number.trim())
  const belowMinAmount = nAmount > 0 && nAmount < minWithdraw
  const balanceOk = withdrawBalance >= minWithdraw
  const amountWithinBalance = nAmount <= withdrawBalance
  const feeAmount = useMemo(() => {
    return Number(((nAmount * withdrawFeePercent) / 100).toFixed(2))
  }, [nAmount, withdrawFeePercent])

  const receiveAmount = useMemo(() => {
    return Number(Math.max(nAmount - feeAmount, 0).toFixed(2))
  }, [nAmount, feeAmount])

  const showFeePreview = !!method && validNumber && nAmount > 0

  const canSubmit =
    balanceOk &&
    nAmount >= minWithdraw &&
    amountWithinBalance &&
    !!method &&
    validNumber &&
    !submitting

  useEffect(() => {
    let ignore = false

    async function loadWithdrawData() {
      try {
        setLoading(true)

        const res = await fetch("/api/withdraw", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (res.status === 401) {
          toast.error(data?.message || "Unauthorized access")
          router.replace("/users/login")
          router.refresh()
          return
        }

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load withdraw data")
        }

        if (!ignore) {
          setHistory(Array.isArray(data?.withdraws) ? data.withdraws : [])
          setWithdrawBalance(Number(data?.withdrawBalance || 0))
          setMinWithdraw(Number(data?.minWithdrawAmount || 50))
          setWithdrawFeePercent(Number(data?.withdrawFeePercent || 0))
          setLimitStats(normalizeLimitStats(data?.limitStats))
        }
      } catch (err) {
        console.error(err)
        if (!ignore) {
          toast.error(err.message || "Failed to load withdraw data")
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadWithdrawData()

    return () => {
      ignore = true
    }
  }, [router])

  useEffect(() => {
    if (!limitModal?.retryAt) {
      setCountdown("")
      return undefined
    }

    const updateCountdown = () => {
      setCountdown(formatCountdown(limitModal.retryAt))
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)

    return () => clearInterval(timer)
  }, [limitModal])

  function handleAmountChange(value) {
    const clean = String(value).replace(/\D/g, "").slice(0, 7)
    setAmount(clean)
  }

  function handleNumberChange(value) {
    const clean = String(value).replace(/\D/g, "").slice(0, 11)
    setNumber(clean)
  }

  async function handleWithdrawRequest() {
    if (!canSubmit) return

    try {
      setSubmitting(true)

      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          number: number.trim(),
          amount: nAmount,
        }),
      })

      const data = await res.json()

      if (res.status === 401) {
        toast.error(data?.message || "Unauthorized access")
        router.replace("/users/login")
        router.refresh()
        return
      }

      if (res.status === 429 || data?.limitBlocked) {
        setLimitStats(normalizeLimitStats(data?.limitStats))
        setLimitModal(data?.limitModal || null)
        toast.error(data?.message || "Withdraw limit reached")
        return
      }

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create withdraw request")
      }

      if (data?.withdraw) {
        setHistory((prev) => [data.withdraw, ...prev])
      }

      if (typeof data?.withdrawBalance !== "undefined") {
        setWithdrawBalance(Number(data.withdrawBalance || 0))
      }

      setLimitStats(normalizeLimitStats(data?.limitStats))
      setAmount("")
      setNumber("")
      setMethod("bkash")
      setLimitModal(null)

      toast.success(data?.message || "Withdraw request submitted successfully")
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to create withdraw request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#081120] px-4 py-8 text-white sm:px-6">
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

      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            WITHDRAW
          </div>
        </div>

        <section
          className="rounded-[28px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
          style={{ boxShadow: formShadow }}
        >
          <div className="space-y-3">
            <div
              className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/10 px-4 py-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-sm font-semibold leading-relaxed text-[#dbeafe]">
                Your withdraw balance is{" "}
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-white">
                  ৳{formatMoney(withdrawBalance)}
                </span>
                {" "}and minimum withdraw amount is{" "}
                <span className="rounded-lg bg-[#3b82f6]/20 px-2 py-0.5 text-white">
                  ৳{formatMoney(minWithdraw)}
                </span>
                .
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatBox
                label="Daily Count"
                value={
                  limitStats.isCountLimited
                    ? `${limitStats.last24HourWithdrawCount}/${limitStats.dailyWithdrawCountLimit}`
                    : "Unlimited"
                }
                hint={
                  limitStats.isCountLimited
                    ? `${limitStats.remainingWithdrawCount ?? 0} requests left`
                    : "No count cap"
                }
              />
              <StatBox
                label="Daily Amount"
                value={
                  limitStats.isAmountLimited
                    ? `৳${formatMoney(limitStats.last24HourWithdrawAmount)}`
                    : "Unlimited"
                }
                hint={
                  limitStats.isAmountLimited
                    ? `Left ৳${formatMoney(limitStats.remainingWithdrawAmount || 0)}`
                    : "No amount cap"
                }
              />
            </div>

            <ProgressCard
              title="Request Limit Progress"
              current={limitStats.last24HourWithdrawCount}
              total={limitStats.dailyWithdrawCountLimit}
              percent={limitStats.countUsagePercent}
              unit="requests"
            />

            <ProgressCard
              title="Amount Limit Progress"
              current={limitStats.last24HourWithdrawAmount}
              total={limitStats.dailyMaxWithdrawLimit}
              percent={limitStats.amountUsagePercent}
              unit="amount"
              money
            />

            {(limitStats.isCountBlocked || limitStats.isAmountBlocked) && (
              <div
                className="rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-sm font-semibold text-[#fde68a]">
                  {limitStats.isCountBlocked && limitStats.isAmountBlocked
                    ? "You have reached both request and amount limit for the last 24 hours."
                    : limitStats.isCountBlocked
                    ? "You have reached the request count limit for the last 24 hours."
                    : "You have used the full withdraw amount limit for the last 24 hours."}
                </p>
                {limitStats.retryAtText ? (
                  <p className="mt-1 text-[12px] text-[#fde68a]/90">
                    Next retry window: {limitStats.retryAtText}
                  </p>
                ) : null}
              </div>
            )}

            <div
              className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
                Method
              </p>

              <div className="grid grid-cols-2 gap-3">
                {methods.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMethod(item.key)}
                    className={`h-12 rounded-2xl border text-sm font-semibold transition active:translate-y-[1px] ${
                      method === item.key
                        ? "border-[#60a5fa]/30 bg-[#3b82f6] text-white"
                        : "border-white/10 bg-[#101d38] text-white/80 hover:text-white"
                    }`}
                    style={{ boxShadow: method === item.key ? btnShadow : fieldShadow }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
                Amount
              </p>

              <input
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                inputMode="numeric"
                placeholder="Enter amount (৳)"
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#101d38] px-4 text-sm outline-none placeholder:text-white/35"
                style={{ boxShadow: fieldShadow }}
              />

              {belowMinAmount && (
                <div
                  className="mt-3 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-4 py-3"
                  style={{ boxShadow: fieldShadow }}
                >
                  <p className="text-sm font-semibold text-[#fca5a5]">
                    Minimum withdraw amount is{" "}
                    <span className="rounded-lg bg-[#ef4444]/20 px-2 py-0.5 text-white">
                      ৳{formatMoney(minWithdraw)}
                    </span>
                    .
                  </p>
                </div>
              )}

              {nAmount > withdrawBalance && (
                <div
                  className="mt-3 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-4 py-3"
                  style={{ boxShadow: fieldShadow }}
                >
                  <p className="text-sm font-semibold text-[#fca5a5]">
                    Withdraw amount exceeds your withdraw balance.
                  </p>
                </div>
              )}

              {limitStats.isAmountLimited && !limitStats.isAmountBlocked && nAmount > (limitStats.remainingWithdrawAmount || 0) && (
                <div
                  className="mt-3 rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3"
                  style={{ boxShadow: fieldShadow }}
                >
                  <p className="text-sm font-semibold text-[#fde68a]">
                    You can withdraw up to ৳{formatMoney(limitStats.remainingWithdrawAmount || 0)} now within the last 24-hour amount limit.
                  </p>
                </div>
              )}
            </div>

            <div
              className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
                Mobile Number
              </p>

              <div className="flex items-center gap-2">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#101d38] text-[#60a5fa]"
                  style={{ boxShadow: fieldShadow }}
                >
                  <HiOutlinePhone className="text-base" />
                </div>

                <input
                  value={number}
                  onChange={(e) => handleNumberChange(e.target.value)}
                  inputMode="numeric"
                  placeholder={`Enter ${method === "bkash" ? "bKash" : "Nagad"} number`}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#101d38] px-4 text-sm outline-none placeholder:text-white/35"
                  style={{ boxShadow: fieldShadow }}
                />
              </div>
            </div>

            {showFeePreview && (
              <div
                className="rounded-2xl border border-[#60a5fa]/20 bg-[linear-gradient(180deg,#12315f_0%,#0f1d37_100%)] px-4 py-3"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-sm font-semibold leading-relaxed text-[#dbeafe]">
                  Withdraw fee{" "}
                  <span className="rounded-lg bg-white/10 px-2 py-0.5 text-white">
                    {withdrawFeePercent}%
                  </span>
                  {" "}means ৳{formatMoney(nAmount)} - ৳{formatMoney(feeAmount)} ={" "}
                  <span className="rounded-lg bg-[#22c55e]/20 px-2 py-0.5 font-extrabold text-[#bbf7d0]">
                    You will receive ৳{formatMoney(receiveAmount)}
                  </span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleWithdrawRequest}
              disabled={!canSubmit}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold transition ${
                canSubmit
                  ? "bg-[#3b82f6] text-white hover:brightness-[1.03] active:translate-y-[1px]"
                  : "cursor-not-allowed bg-[#101d38] text-white/30"
              }`}
              style={{ boxShadow: canSubmit ? btnShadow : fieldShadow }}
            >
              <HiArrowUp className="text-lg" />
              {submitting ? "Processing..." : "Withdraw Request"}
            </button>
          </div>
        </section>

        <section
          className="rounded-[28px] border border-white/10 bg-[#0a1428] p-6 sm:p-7"
          style={{ boxShadow: formShadow }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Withdraw <span className="text-[#60a5fa]">History</span>
            </h2>
            <span className="text-xs text-white/45">
              {loading ? "Loading..." : `${history.length} items`}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {!loading && history.length === 0 ? (
              <div
                className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/55"
                style={{ boxShadow: fieldShadow }}
              >
                No withdraw requests yet.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
                  style={{ boxShadow: fieldShadow }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        ৳{formatMoney(item.amount)}
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {item.method === "bkash" ? "bKash" : "Nagad"} • {item.number}
                      </p>
                      <p className="mt-1 text-[11px] text-white/35">
                        Fee {item.feePercent || 0}% • You receive ৳
                        {formatMoney(item.payableAmount ?? item.amount)}
                      </p>
                      <p className="mt-1 text-[11px] text-white/35">
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

      {limitModal && (
        <LimitModal
          data={limitModal}
          countdown={countdown}
          onClose={() => setLimitModal(null)}
        />
      )}
    </main>
  )
}

function StatBox({ label, value, hint }) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-[12px] text-white/45">{hint}</p>
    </div>
  )
}

function ProgressCard({ title, current, total, percent, unit, money = false }) {
  const unlimited = !Number(total)

  const currentText = money ? `৳${formatMoney(current)}` : formatMoney(current)
  const totalText = money ? `৳${formatMoney(total)}` : formatMoney(total)

  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
      style={{ boxShadow: fieldShadow }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-[11px] text-white/45">
          {unlimited ? "Unlimited" : `${currentText} / ${totalText}`}
        </p>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full ${percent >= 100 ? "bg-[#ef4444]" : percent >= 80 ? "bg-[#f59e0b]" : "bg-[#3b82f6]"}`}
          style={{ width: unlimited ? "0%" : `${Math.max(0, Math.min(percent, 100))}%` }}
        />
      </div>

      <p className="mt-2 text-[12px] text-white/55">
        {unlimited ? `No ${unit} limit configured.` : `${percent}% of your ${unit} limit is already used.`}
      </p>
    </div>
  )
}

function LimitModal({ data, countdown, onClose }) {
  const showCurrentAllowed = !data?.countWouldBlock && Number(data?.currentAllowedAmount || 0) > 0

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-3">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-[360px] rounded-[22px] border border-white/10 bg-[#0a1428] p-4"
        style={{ boxShadow: "0 30px 120px rgba(0,0,0,.7)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Withdraw <span className="text-[#60a5fa]">Limit</span>
            </h3>
            <p className="mt-1 text-[12px] text-white/45">
              Last 24-hour usage summary
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-[#0f1a33] text-white/65 transition hover:text-white"
            style={{ boxShadow: fieldShadow }}
            aria-label="Close"
          >
            <HiOutlineX className="text-base" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div
            className="rounded-2xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3"
            style={{ boxShadow: fieldShadow }}
          >
            <div className="flex items-center gap-2 text-[#fde68a]">
              <HiOutlineClock className="text-base" />
              <p className="text-sm font-semibold">Try again after {countdown || data?.retryInText || "some time"}</p>
            </div>
            {data?.retryAtText ? (
              <p className="mt-1 text-[12px] text-[#fde68a]/90">
                Next full retry time: {data.retryAtText}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniInfo label="Used Requests" value={`${data?.last24HourWithdrawCount || 0}/${data?.dailyWithdrawCountLimit ? data.dailyWithdrawCountLimit : "∞"}`} />
            <MiniInfo label="Used Amount" value={`৳${formatMoney(data?.last24HourWithdrawAmount || 0)}`} />
          </div>

          {data?.dailyMaxWithdrawLimit ? (
            <MiniInfo label="Amount Limit" value={`৳${formatMoney(data.dailyMaxWithdrawLimit)}`} />
          ) : null}

          {showCurrentAllowed ? (
            <div
              className="rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-sm font-semibold text-[#bbf7d0]">
                You can still withdraw up to ৳{formatMoney(data.currentAllowedAmount)} right now.
              </p>
              {Number(data?.amountShortBy || 0) > 0 ? (
                <p className="mt-1 text-[12px] text-[#bbf7d0]/85">
                  Your current request is higher by ৳{formatMoney(data.amountShortBy)}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function MiniInfo({ label, value }) {
  return (
    <div
      className="rounded-2xl border border-white/10 bg-[#0f1a33] px-4 py-3"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function StatusPill({ status }) {
  const s = String(status || "").toLowerCase()

  const cls =
    s === "pending"
      ? "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#fcd34d]"
      : s === "rejected"
      ? "border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]"
      : "border-[#60a5fa]/25 bg-[#3b82f6]/10 text-[#93c5fd]"

  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold ${cls}`}>
      {s || "pending"}
    </span>
  )
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

function normalizeLimitStats(stats) {
  return {
    ...defaultLimitStats,
    ...stats,
  }
}

function formatCountdown(retryAt) {
  const target = new Date(retryAt)
  if (Number.isNaN(target.getTime())) {
    return ""
  }

  const diff = Math.max(target.getTime() - Date.now(), 0)
  const totalSeconds = Math.ceil(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
}
