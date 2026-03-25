"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

export default function TransactionsPage() {
  const router = useRouter()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadTransactions() {
      try {
        setLoading(true)

        const res = await fetch("/api/transactions", {
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
          throw new Error(data?.message || "Failed to load transactions")
        }

        if (!ignore) {
          setItems(Array.isArray(data?.transactions) ? data.transactions : [])
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load transactions")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      ignore = true
    }
  }, [router])

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
            TRANSACTIONS
          </div>
        </div>

        <section
          className="rounded-[28px] border border-white/10 bg-[#0a1428] p-6 sm:p-7"
          style={{ boxShadow: formShadow }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Transaction <span className="text-[#60a5fa]">History</span>
            </h2>
            <span className="text-xs text-white/45">
              {loading ? "Loading..." : `${items.length} items`}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div
                className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/55"
                style={{ boxShadow: fieldShadow }}
              >
                Loading transactions...
              </div>
            ) : items.length === 0 ? (
              <div
                className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/55"
                style={{ boxShadow: fieldShadow }}
              >
                No transactions found.
              </div>
            ) : (
              items.map((item) => (
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