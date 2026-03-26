"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiArrowUp,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineX,
} from "react-icons/hi"

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

const fallbackMethods = [
  { key: "bkash", label: "bKash" },
  { key: "nagad", label: "Nagad" },
  { key: "recharge", label: "Recharge" },
]

const fallbackOperators = [
  { key: "grameenphone", label: "Grameenphone" },
  { key: "robi", label: "Robi" },
  { key: "airtel", label: "Airtel" },
  { key: "teletalk", label: "Teletalk" },
  { key: "banglalink", label: "Banglalink" },
]

export default function WithdrawPage() {
  const router = useRouter()

  const [method, setMethod] = useState("bkash")
  const [operator, setOperator] = useState("")
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
  const [rechargeThreshold, setRechargeThreshold] = useState(50)
  const [rechargeOperators, setRechargeOperators] = useState(fallbackOperators)

  const nAmount = useMemo(() => {
    const value = Number(String(amount).replace(/\D/g, ""))
    return Number.isFinite(value) ? Math.max(0, value) : 0
  }, [amount])

  const validNumber = /^01\d{9}$/.test(number.trim())
  const isRecharge = method === "recharge"
  const mustUseRecharge = nAmount > 0 && nAmount < rechargeThreshold
  const amountWithinBalance = nAmount <= withdrawBalance
  const feePercentToUse = isRecharge ? 0 : withdrawFeePercent
  const belowMinimumForCashout = !isRecharge && nAmount > 0 && nAmount < minWithdraw
  const amountRequirementMet = isRecharge ? nAmount > 0 : nAmount >= minWithdraw
  const balanceRequirement = isRecharge ? withdrawBalance > 0 : withdrawBalance >= minWithdraw

  const feeAmount = useMemo(() => {
    return Number(((nAmount * feePercentToUse) / 100).toFixed(2))
  }, [nAmount, feePercentToUse])

  const receiveAmount = useMemo(() => {
    return Number(Math.max(nAmount - feeAmount, 0).toFixed(2))
  }, [nAmount, feeAmount])

  const showPreview = validNumber && nAmount > 0 && !!method
  const canSubmit =
    balanceRequirement &&
    amountRequirementMet &&
    amountWithinBalance &&
    validNumber &&
    !!method &&
    (!isRecharge || !!operator) &&
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
          setRechargeThreshold(Number(data?.rechargeAutoThreshold || 50))
          setRechargeOperators(
            Array.isArray(data?.rechargeOperators) && data.rechargeOperators.length
              ? data.rechargeOperators
              : fallbackOperators
          )
        }
      } catch (error) {
        console.error(error)
        if (!ignore) {
          toast.error(error.message || "Failed to load withdraw data")
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
    if (mustUseRecharge && method !== "recharge") {
      setMethod("recharge")
    }
  }, [mustUseRecharge, method])

  useEffect(() => {
    if (method !== "recharge") {
      setOperator("")
    }
  }, [method])

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
          operator,
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
      setOperator("")
      setMethod("bkash")
      setLimitModal(null)

      toast.success(data?.message || "Withdraw request submitted successfully")
    } catch (error) {
      console.error(error)
      toast.error(error.message || "Failed to create withdraw request")
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

      <div className="mx-auto w-full max-w-sm space-y-4">
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
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
          style={{ boxShadow: formShadow }}
        >
          <div className="space-y-3">
            <div
              className="rounded-md border border-[#3b82f6]/20 bg-[#3b82f6]/10 px-4 py-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-sm font-semibold leading-relaxed text-[#dbeafe]">
                Your withdraw balance is{" "}
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-white">
                  ৳{formatMoney(withdrawBalance)}
                </span>
                {" "}and minimum cash withdraw amount is{" "}
                <span className="rounded-md bg-[#3b82f6]/20 px-2 py-0.5 text-white">
                  ৳{formatMoney(minWithdraw)}
                </span>
                .
              </p>
            </div>

            <div
              className="rounded-md border border-[#22c55e]/20 bg-[#22c55e]/10 px-4 py-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-sm font-semibold leading-relaxed text-[#bbf7d0]">
                Amounts below <span className="rounded-md bg-white/10 px-2 py-0.5 text-white">৳{formatMoney(rechargeThreshold)}</span>{" "}
                will be processed as mobile recharge automatically.
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
                className="rounded-md border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-sm font-semibold text-[#fde68a]">
                  Withdraw limit reached. You can try again after{" "}
                  <span className="text-white">{limitStats.retryInText || "some time"}</span>.
                </p>
                {limitStats.retryAtText ? (
                  <p className="mt-1 text-xs text-[#fde68a]/85">
                    Next available time: {limitStats.retryAtText}
                  </p>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {fallbackMethods.map((item) => {
                const disabled = mustUseRecharge && item.key !== "recharge"
                const active = method === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => !disabled && setMethod(item.key)}
                    disabled={disabled}
                    className={`h-11 rounded-md border text-sm font-semibold transition ${
                      active
                        ? "border-[#3b82f6]/40 bg-[#3b82f6]/20 text-white"
                        : "border-white/10 bg-[#0f1a33] text-white/70"
                    } ${disabled ? "cursor-not-allowed opacity-40" : "hover:brightness-[1.03]"}`}
                    style={{ boxShadow: fieldShadow }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            {isRecharge && (
              <div
                className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                  Select mobile operator
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {rechargeOperators.map((item) => {
                    const active = operator === item.key

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setOperator(item.key)}
                        className={`h-11 rounded-md border px-3 text-sm font-semibold transition ${
                          active
                            ? "border-[#22c55e]/35 bg-[#22c55e]/15 text-[#bbf7d0]"
                            : "border-white/10 bg-[#101a31] text-white/75 hover:brightness-[1.03]"
                        }`}
                        style={{ boxShadow: fieldShadow }}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
                {!operator ? (
                  <p className="mt-2 text-xs text-white/45">
                    Please select one operator for mobile recharge.
                  </p>
                ) : null}
              </div>
            )}

            <label className="block space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                Mobile Number
              </span>
              <div
                className="flex h-12 items-center rounded-md border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  value={number}
                  onChange={(e) => handleNumberChange(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/35"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                Amount
              </span>
              <div
                className="flex h-12 items-center rounded-md border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlineCash className="mr-3 shrink-0 text-[#60a5fa]" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/35"
                />
              </div>
            </label>

            {mustUseRecharge ? (
              <div
                className="rounded-md border border-[#22c55e]/20 bg-[#22c55e]/10 px-4 py-3"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-sm font-semibold text-[#bbf7d0]">
                  This request will go as mobile recharge because the amount is below ৳{formatMoney(rechargeThreshold)}.
                </p>
              </div>
            ) : null}

            {belowMinimumForCashout ? (
              <p className="text-xs text-[#fca5a5]">
                Minimum cash withdraw is ৳{formatMoney(minWithdraw)}.
              </p>
            ) : null}

            {!amountWithinBalance && nAmount > 0 ? (
              <p className="text-xs text-[#fca5a5]">
                Withdraw amount exceeds your available withdraw balance.
              </p>
            ) : null}

            {showPreview ? (
              <div
                className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4"
                style={{ boxShadow: fieldShadow }}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/60">Method</span>
                  <span className="font-semibold text-white">
                    {formatMethodLabel(method, operator, rechargeOperators)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/60">Number</span>
                  <span className="font-semibold text-white">{number}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/60">Fee</span>
                  <span className="font-semibold text-white">
                    {feePercentToUse}% • ৳{formatMoney(feeAmount)}
                  </span>
                </div>
                <div className="mt-3 rounded-md border border-[#22c55e]/15 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#bbf7d0]">
                  <span className="font-medium">{isRecharge ? "Recharge amount" : "You will receive"}</span>{" "}
                  <span className="rounded-md bg-white/10 px-2 py-0.5 font-extrabold text-[#bbf7d0]">
                    ৳{formatMoney(receiveAmount)}
                  </span>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleWithdrawRequest}
              disabled={!canSubmit}
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-md font-semibold transition ${
                canSubmit
                  ? "bg-[#3b82f6] text-white hover:brightness-[1.03] active:translate-y-[1px]"
                  : "cursor-not-allowed bg-[#101d38] text-white/30"
              }`}
              style={{ boxShadow: canSubmit ? btnShadow : fieldShadow }}
            >
              <HiArrowUp className="text-lg" />
              {submitting
                ? "Processing..."
                : isRecharge
                ? "Submit Recharge Request"
                : "Withdraw Request"}
            </button>
          </div>
        </section>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
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
                className="rounded-md border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/55"
                style={{ boxShadow: fieldShadow }}
              >
                No withdraw requests yet.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-white/10 bg-[#0f1a33] p-4"
                  style={{ boxShadow: fieldShadow }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        ৳{formatMoney(item.amount)}
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {item.methodLabel || formatMethodLabel(item.method, item.operator, rechargeOperators)} • {item.number}
                      </p>
                      <p className="mt-1 text-[11px] text-white/35">
                        Fee {item.feePercent || 0}% • {item.method === "recharge" ? "Recharge" : "Receive"} ৳
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

      {limitModal ? (
        <LimitModal
          data={limitModal}
          countdown={countdown}
          onClose={() => setLimitModal(null)}
        />
      ) : null}
    </main>
  )
}

function StatBox({ label, value, hint }) {
  return (
    <div
      className="rounded-md border border-white/10 bg-[#0f1a33] p-4"
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
      className="rounded-md border border-white/10 bg-[#0f1a33] p-4"
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
          className={`h-full rounded-full ${
            percent >= 100
              ? "bg-[#ef4444]"
              : percent >= 80
              ? "bg-[#f59e0b]"
              : "bg-[#3b82f6]"
          }`}
          style={{ width: unlimited ? "0%" : `${Math.max(0, Math.min(percent, 100))}%` }}
        />
      </div>

      <p className="mt-2 text-[12px] text-white/55">
        {unlimited
          ? `No ${unit} limit configured.`
          : `${percent}% of your ${unit} limit is already used.`}
      </p>
    </div>
  )
}

function LimitModal({ data, countdown, onClose }) {
  const showCurrentAllowed =
    !data?.countWouldBlock && Number(data?.currentAllowedAmount || 0) > 0

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-3">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-[360px] rounded-[10px] border border-white/10 bg-[#0a1428] p-4"
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
            className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-[#0f1a33] text-white/65 transition hover:text-white"
            style={{ boxShadow: fieldShadow }}
            aria-label="Close"
          >
            <HiOutlineX className="text-base" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div
            className="rounded-md border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3"
            style={{ boxShadow: fieldShadow }}
          >
            <div className="flex items-center gap-2 text-[#fde68a]">
              <HiOutlineClock className="text-base" />
              <p className="text-sm font-semibold">
                Try again after {countdown || data?.retryInText || "some time"}
              </p>
            </div>
            {data?.retryAtText ? (
              <p className="mt-1 text-[12px] text-[#fde68a]/90">
                Next full retry time: {data.retryAtText}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniInfo
              label="Used Requests"
              value={`${data?.last24HourWithdrawCount || 0}/${data?.dailyWithdrawCountLimit ? data.dailyWithdrawCountLimit : "∞"}`}
            />
            <MiniInfo
              label="Used Amount"
              value={`৳${formatMoney(data?.last24HourWithdrawAmount || 0)}`}
            />
          </div>

          {data?.dailyMaxWithdrawLimit ? (
            <MiniInfo
              label="Amount Limit"
              value={`৳${formatMoney(data.dailyMaxWithdrawLimit)}`}
            />
          ) : null}

          {showCurrentAllowed ? (
            <div
              className="rounded-md border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-3"
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
      className="rounded-md border border-white/10 bg-[#0f1a33] px-4 py-3"
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
  const value = String(status || "").toLowerCase()

  const cls =
    value === "pending"
      ? "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#fcd34d]"
      : value === "rejected"
      ? "border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]"
      : "border-[#60a5fa]/25 bg-[#3b82f6]/10 text-[#93c5fd]"

  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold ${cls}`}>
      {value || "pending"}
    </span>
  )
}

function formatMethodLabel(method, operator, operators = fallbackOperators) {
  if (method === "bkash") return "bKash"
  if (method === "nagad") return "Nagad"
  if (method === "recharge") {
    const operatorLabel = operators.find((item) => item.key === operator)?.label || "Recharge"
    return operator ? `Recharge • ${operatorLabel}` : "Recharge"
  }
  return "Unknown"
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
