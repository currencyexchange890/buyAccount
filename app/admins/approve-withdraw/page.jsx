"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineUser,
  HiOutlineCash,
  HiOutlinePhone,
  HiOutlineCreditCard,
  HiOutlineCheck,
  HiOutlineX,
} from "react-icons/hi"

const shellShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const cardShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

export default function ApproveWithdrawPage() {
  const router = useRouter()

  const [withdrawRequests, setWithdrawRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingKey, setProcessingKey] = useState("")

  useEffect(() => {
    let ignore = false

    async function loadWithdrawRequests() {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/approve-withdraw", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })

        if (res.status === 401) {
          toast.error("Admin access required")
          router.replace("/users/login")
          router.refresh()
          return
        }

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load withdraw requests")
        }

        if (!ignore) {
          setWithdrawRequests(Array.isArray(data?.withdraws) ? data.withdraws : [])
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load withdraw requests")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadWithdrawRequests()

    return () => {
      ignore = true
    }
  }, [router])

  async function handleAction(withdrawId, action) {
    const key = `${withdrawId}:${action}`

    try {
      setProcessingKey(key)

      const res = await fetch("/api/admin/approve-withdraw", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          withdrawId,
          action,
        }),
      })

      if (res.status === 401) {
        toast.error("Admin access required")
        router.replace("/users/login")
        router.refresh()
        return
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || "Failed to process withdraw request")
      }

      setWithdrawRequests((prev) => prev.filter((item) => item.id !== withdrawId))
      toast.success(data?.message || "Withdraw processed successfully")
    } catch (error) {
      toast.error(error.message || "Failed to process withdraw request")
    } finally {
      setProcessingKey("")
    }
  }

  async function handleCopy(text, successMessage = "Copied successfully") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text))
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = String(text)
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        textArea.remove()
      }

      toast.success(successMessage)
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <main className="min-h-full text-white">
      <WithdrawPageAnimations />

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
            ADMIN PANEL
          </div>
        </div>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-4">
            <p className="text-[11px] font-medium text-white/45">Manage withdraw requests</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-[30px]">
              Approve <span className="text-[#60a5fa]">Withdraw</span>
            </h1>
          </div>

          {loading ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              Loading pending withdraw requests...
            </div>
          ) : withdrawRequests.length === 0 ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              No pending withdraw requests found.
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawRequests.map((item, index) => {
                const isAccepting = processingKey === `${item.id}:accept`
                const isRejecting = processingKey === `${item.id}:reject`
                const isBusy = Boolean(processingKey)

                return (
                  <div
                    key={item.id}
                    className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
                    style={{ boxShadow: cardShadow }}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full border border-white/10 bg-[#101a31] px-2.5 py-1 text-[11px] font-semibold text-white/80">
                          #{index + 1}
                        </div>
                        <div className="rounded-full border border-white/10 bg-[#14203d] px-2.5 py-1 text-[11px] font-semibold text-[#60a5fa]">
                          Pending
                        </div>
                      </div>

                      <p className="text-[11px] text-white/40">Review request</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      <InfoBox
                        icon={<HiOutlineUser className="text-[13px]" />}
                        label="User"
                        value={item.name}
                        valueClass="text-white"
                      />

                      <AmountInfoBox
                        icon={<HiOutlineCash className="text-[13px]" />}
                        label="Amount"
                        amount={item.amount}
                        payableAmount={item.payableAmount}
                        feePercent={item.feePercent}
                        onCopy={() =>
                          handleCopy(
                            formatMoney(item.payableAmount),
                            "Payable amount copied"
                          )
                        }
                      />

                      <InfoBox
                        icon={<HiOutlineCreditCard className="text-[13px]" />}
                        label="Method"
                        value={item.methodLabel || formatMethod(item.method, item.operator)}
                        valueClass="text-[#60a5fa]"
                      />

                      <NumberInfoBox
                        icon={<HiOutlinePhone className="text-[13px]" />}
                        label="Number"
                        value={item.number}
                        onCopy={() => handleCopy(item.number, "Number copied")}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:w-[240px]">
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "accept")}
                        disabled={isBusy}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-[13px] font-semibold text-white transition hover:brightness-105 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          boxShadow:
                            "0 16px 32px rgba(34,197,94,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
                        }}
                      >
                        <HiOutlineCheck className="text-sm" />
                        {isAccepting ? "Accepting..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "reject")}
                        disabled={isBusy}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-[13px] font-semibold text-white transition hover:brightness-105 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          boxShadow:
                            "0 16px 32px rgba(239,68,68,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
                        }}
                      >
                        <HiOutlineX className="text-sm" />
                        {isRejecting ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function WithdrawPageAnimations() {
  return (
    <style jsx global>{`
      @keyframes strikeShineMove {
        0% {
          transform: translateX(-120%) rotate(-8deg);
          opacity: 0;
        }
        20% {
          opacity: 1;
        }
        100% {
          transform: translateX(120%) rotate(-8deg);
          opacity: 0;
        }
      }
    `}</style>
  )
}

function InfoBox({ icon, label, value, valueClass }) {
  return (
    <div
      className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2"
      style={{ boxShadow: cardShadow }}
    >
      <div className="mb-1 flex items-center gap-1.5 text-white/45">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className={`text-[13px] font-semibold leading-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}

function NumberInfoBox({ icon, label, value, onCopy }) {
  return (
    <div
      className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2"
      style={{ boxShadow: cardShadow }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-white/45">
          {icon}
          <span className="text-[10px] uppercase tracking-[0.1em]">{label}</span>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="h-6 rounded-full border border-emerald-300/20 bg-[#22c55e] px-2 text-[9px] font-semibold text-white transition hover:brightness-105"
          style={{
            boxShadow:
              "0 10px 18px rgba(34,197,94,.22), inset 1px 1px 0 rgba(255,255,255,.12), inset -1px -1px 0 rgba(0,0,0,.12)",
          }}
        >
          Copy
        </button>
      </div>

      <p className="text-[13px] font-semibold leading-tight text-white">
        {value}
      </p>
    </div>
  )
}

function AmountInfoBox({ icon, label, amount, payableAmount, feePercent, onCopy }) {
  return (
    <div
      className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2"
      style={{ boxShadow: cardShadow }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-white/45">
          {icon}
          <span className="text-[10px] uppercase tracking-[0.1em]">{label}</span>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="h-6 rounded-full border border-emerald-300/20 bg-[#22c55e] px-2 text-[9px] font-semibold text-white transition hover:brightness-105"
          style={{
            boxShadow:
              "0 10px 18px rgba(34,197,94,.22), inset 1px 1px 0 rgba(255,255,255,.12), inset -1px -1px 0 rgba(0,0,0,.12)",
          }}
        >
          Copy
        </button>
      </div>

      <div className="space-y-1">
        <div className="relative inline-flex overflow-hidden">
          <span className="relative text-[13px] font-semibold leading-tight text-white/55">
            ৳{formatMoney(amount)}
          </span>

          <span
            className="pointer-events-none absolute left-[-10%] top-1/2 h-[2px] w-[120%] -translate-y-1/2 rotate-[-8deg] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(248,113,113,.55)_30%,rgba(255,255,255,.95)_50%,rgba(248,113,113,.55)_70%,rgba(255,255,255,0)_100%)]"
            style={{
              animation: "strikeShineMove 2.2s linear infinite",
              boxShadow: "0 0 10px rgba(255,255,255,.35)",
            }}
          />
        </div>

        <p className="text-[11px] font-semibold leading-tight text-[#86efac]">
          {feePercent > 0
            ? `You get ৳${formatMoney(payableAmount)}`
            : `Recharge ৳${formatMoney(payableAmount)}`}
        </p>

        <p className="text-[10px] leading-tight text-white/40">
          {feePercent > 0 ? `Fee ${feePercent}%` : "No fee"}
        </p>
      </div>
    </div>
  )
}

function formatMethod(value, operator = "") {
  const method = String(value || "").toLowerCase()

  if (method === "bkash") return "Bkash"
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

  return value || ""
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}