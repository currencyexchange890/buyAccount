"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineCash,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlinePhone,
  HiOutlineClock,
} from "react-icons/hi"

const cardShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

export default function ApproveDepositPage() {
  const router = useRouter()

  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingKey, setProcessingKey] = useState("")

  const totalPendingAmount = useMemo(() => {
    return deposits.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [deposits])

  useEffect(() => {
    let ignore = false

    async function loadPendingDeposits() {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/approve-deposit", {
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
          throw new Error(data?.message || "Failed to load pending deposits")
        }

        if (!ignore) {
          setDeposits(Array.isArray(data?.deposits) ? data.deposits : [])
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load pending deposits")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadPendingDeposits()

    return () => {
      ignore = true
    }
  }, [router])

  async function handleAction(depositId, action) {
    const key = `${depositId}:${action}`

    try {
      setProcessingKey(key)

      const res = await fetch("/api/admin/approve-deposit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          depositId,
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
        throw new Error(data?.message || "Failed to process deposit")
      }

      setDeposits((prev) => prev.filter((item) => item.id !== depositId))
      toast.success(data?.message || "Deposit processed successfully")
    } catch (error) {
      toast.error(error.message || "Failed to process deposit")
    } finally {
      setProcessingKey("")
    }
  }

  return (
    <main className="min-h-full text-white">
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
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            ADMIN PANEL
          </div>
        </div>

        <section
          className="rounded-[28px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-medium text-white/45">Manage deposit requests</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                Approve <span className="text-[#60a5fa]">Deposit</span>
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3 md:w-[320px]">
              <div
                className="rounded-[18px] border border-white/10 bg-[#0f1a33] px-4 py-3"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                  Pending
                </p>
                <p className="mt-1 text-lg font-bold text-white">{deposits.length}</p>
              </div>

              <div
                className="rounded-[18px] border border-white/10 bg-[#0f1a33] px-4 py-3"
                style={{ boxShadow: fieldShadow }}
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                  Amount
                </p>
                <p className="mt-1 text-lg font-bold text-[#facc15]">
                  ৳{formatMoney(totalPendingAmount)}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              className="rounded-[20px] border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/60"
              style={{ boxShadow: fieldShadow }}
            >
              Loading pending deposits...
            </div>
          ) : deposits.length === 0 ? (
            <div
              className="rounded-[20px] border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/60"
              style={{ boxShadow: fieldShadow }}
            >
              No pending deposit requests found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {deposits.map((item) => {
                const isAccepting = processingKey === `${item.id}:accept`
                const isRejecting = processingKey === `${item.id}:reject`
                const isBusy = Boolean(processingKey)

                return (
                  <div
                    key={item.id}
                    className="rounded-[20px] border border-white/10 bg-[#0f1a33] p-3"
                    style={{ boxShadow: cardShadow }}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                          Pending Request
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-white">
                          {item.userName}
                        </p>
                      </div>

                      <StatusPill status={item.status} />
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <InfoCard
                          icon={<HiOutlinePhone className="text-sm" />}
                          label="Mobile Number"
                          value={item.number}
                        />

                        <InfoCard
                          icon={<HiOutlineCash className="text-sm" />}
                          label="Amount"
                          value={`৳${formatMoney(item.amount)}`}
                          valueClassName="text-[#facc15]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <InfoCard
                          icon={<HiOutlineCash className="text-sm" />}
                          label="Method"
                          value={item.method === "bkash" ? "bKash" : "Nagad"}
                          valueClassName="text-[#60a5fa]"
                        />

                        <InfoCard
                          icon={<HiOutlineClock className="text-sm" />}
                          label="Date"
                          value={formatDate(item.createdAt)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "accept")}
                        disabled={isBusy}
                        className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-sm font-semibold text-white transition hover:brightness-105 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          boxShadow:
                            "0 16px 32px rgba(34,197,94,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
                        }}
                      >
                        <HiOutlineCheck className="text-base" />
                        {isAccepting ? "Accepting..." : "Accept"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(item.id, "reject")}
                        disabled={isBusy}
                        className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-sm font-semibold text-white transition hover:brightness-105 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          boxShadow:
                            "0 16px 32px rgba(239,68,68,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
                        }}
                      >
                        <HiOutlineX className="text-base" />
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

function InfoCard({ icon, label, value, valueClassName = "text-white" }) {
  return (
    <div
      className="rounded-[16px] border border-white/10 bg-[#101a31] px-3 py-2.5"
      style={{ boxShadow: fieldShadow }}
    >
      <div className="mb-1 flex items-center gap-1.5 text-white/45">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className={`truncate text-sm font-semibold ${valueClassName}`}>{value}</p>
    </div>
  )
}

function StatusPill({ status }) {
  const normalized = String(status || "").toLowerCase()

  const cls =
    normalized === "pending"
      ? "border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#fcd34d]"
      : normalized === "rejected"
      ? "border-[#ef4444]/25 bg-[#ef4444]/10 text-[#fca5a5]"
      : "border-[#60a5fa]/25 bg-[#3b82f6]/10 text-[#93c5fd]"

  return (
    <span className={`rounded-xl border px-2.5 py-1 text-[10px] font-semibold ${cls}`}>
      {capitalize(normalized)}
    </span>
  )
}

function capitalize(value) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })
}

function formatDate(value) {
  if (!value) return ""

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  })
}