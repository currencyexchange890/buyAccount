"use client"

import { useEffect, useMemo, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineX,
  HiOutlineClipboardCopy,
  HiOutlinePhone,
} from "react-icons/hi"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function DepositPage() {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("")
  const [sender, setSender] = useState("")
  const [modalOpen, setModalOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState([])
  const [minimumDeposit, setMinimumDeposit] = useState(0)
  const [paymentNumbers, setPaymentNumbers] = useState({
    bkash: "",
    nagad: "",
  })

  const nAmount = useMemo(() => {
    const cleaned = String(amount).replace(/\D/g, "")
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const effectiveMinimumDeposit = useMemo(() => {
    const numericMinimum = Number(minimumDeposit)
    if (!Number.isFinite(numericMinimum) || numericMinimum < 1) {
      return 1
    }
    return numericMinimum
  }, [minimumDeposit])

  const senderValid = /^01\d{9}$/.test(sender.trim())
  const amountValid = nAmount >= effectiveMinimumDeposit && nAmount <= 50000
  const merchantNumber = method ? paymentNumbers[method] : ""
  const hasReceiverNumber = !!merchantNumber

  const canOpenPayModal = amountValid && !!method && hasReceiverNumber
  const canVerify = amountValid && !!method && senderValid && !submitting

  const methodLabel =
    method === "bkash"
      ? "bKash Personal Account"
      : method === "nagad"
      ? "Nagad Personal Account"
      : ""

  useEffect(() => {
    let ignore = false

    async function loadDeposits() {
      try {
        setLoading(true)

        const res = await fetch("/api/deposit", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message || "Failed to fetch deposit data")
        }

        if (!ignore) {
          setHistory(Array.isArray(data?.deposits) ? data.deposits : [])
          setMinimumDeposit(Number(data?.minimumDeposit) || 0)
          setPaymentNumbers({
            bkash: data?.paymentNumbers?.bkash || "",
            nagad: data?.paymentNumbers?.nagad || "",
          })
        }
      } catch (err) {
        console.error(err)
        if (!ignore) {
          toast.error(err.message || "Failed to load deposit data")
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadDeposits()

    return () => {
      ignore = true
    }
  }, [])

  function handleAmountChange(value) {
    const clean = String(value).replace(/\D/g, "").slice(0, 5)
    setAmount(clean)
  }

  function handleSenderChange(value) {
    const clean = String(value).replace(/\D/g, "").slice(0, 11)
    setSender(clean)
  }

  function handleOpenPayNow() {
    if (nAmount < effectiveMinimumDeposit) {
      toast.error(`Minimum deposit amount is ${effectiveMinimumDeposit} BDT`)
      return
    }

    if (nAmount > 50000) {
      toast.error("Amount must be between minimum deposit and 50000 BDT")
      return
    }

    if (!method) {
      toast.error("Please select a payment method")
      return
    }

    if (!hasReceiverNumber) {
      toast.error("This payment method is not configured yet")
      return
    }

    setSender("")
    setModalOpen(true)
  }

  async function handleVerifyDeposit() {
    if (!canVerify) return

    try {
      setSubmitting(true)

      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: nAmount,
          method,
          number: sender.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || "Failed to create deposit")
      }

      if (data?.deposit) {
        setHistory((prev) => [data.deposit, ...prev])
      }

      toast.success(data?.message || "Deposit request submitted successfully")

      setAmount("")
      setMethod("")
      setSender("")
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(err.message || "Failed to create deposit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#081120] px-3 py-4 text-white">
      <DepositPageAnimations />

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

      <div className="mx-auto w-full max-w-sm space-y-3">
        <div className="flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-3 py-1 text-[11px] font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            DEPOSIT
          </div>
        </div>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-4"
          style={{ boxShadow: formShadow }}
        >
          <div
            className="rounded-[10px] border border-[#60a5fa]/20 bg-[linear-gradient(180deg,#10203f_0%,#0f1a33_100%)] px-3 py-3"
            style={{ boxShadow: fieldShadow }}
          >
            <p className="text-center text-sm font-semibold text-[#dbeafe]">
              Minimum deposit amount is{" "}
              <span className="font-extrabold text-white">
                ৳{formatMoney(effectiveMinimumDeposit)}
              </span>
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
                Amount
              </p>

              <input
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                inputMode="numeric"
                placeholder="Enter amount (৳)"
                className="h-10 w-full rounded-md border border-white/10 bg-[#101d38] px-3 text-sm outline-none placeholder:text-white/35"
                style={{ boxShadow: fieldShadow }}
              />

              <p
                className={`mt-2 text-[11px] ${
                  amount && nAmount < effectiveMinimumDeposit
                    ? "text-[#fca5a5]"
                    : "text-white/45"
                }`}
              >
                Enter at least ৳{formatMoney(effectiveMinimumDeposit)}
              </p>
            </div>

            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
                Select method
              </p>

              <div className="grid grid-cols-2 gap-2">
                {["bkash", "nagad"].map((item) => {
                  const active = method === item

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMethod(item)}
                      className={`h-10 rounded-md border text-sm font-semibold transition ${
                        active
                          ? "border-[#60a5fa]/30 bg-[#3b82f6] text-white"
                          : "border-white/10 bg-[#101d38] text-white/80 hover:text-white"
                      }`}
                      style={{ boxShadow: active ? btnShadow : fieldShadow }}
                    >
                      {item === "bkash" ? "bKash" : "Nagad"}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleOpenPayNow}
                disabled={!canOpenPayModal}
                className={`mt-3 h-11 w-full rounded-md font-semibold text-white transition ${
                  canOpenPayModal
                    ? "bg-[#3b82f6] hover:brightness-[1.03] active:translate-y-[1px]"
                    : "cursor-not-allowed bg-[#101d38] text-white/35"
                }`}
                style={{
                  boxShadow: canOpenPayModal ? btnShadow : fieldShadow,
                }}
              >
                Pay Now
              </button>
            </div>
          </div>
        </section>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-4"
          style={{ boxShadow: formShadow }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Deposit <span className="text-[#60a5fa]">History</span>
            </h2>
            <span className="text-[11px] text-white/45">
              {loading ? "Loading..." : `${history.length} items`}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {!loading && history.length === 0 && (
              <div
                className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 text-sm text-white/55"
                style={{ boxShadow: fieldShadow }}
              >
                No deposit history found.
              </div>
            )}

            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
                style={{ boxShadow: fieldShadow }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      ৳{formatMoney(item.amount)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/55">
                      {item.method === "bkash" ? "bKash" : "Nagad"} • {item.number}
                    </p>
                    <p className="mt-1 text-[10px] text-white/35">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <StatusPill status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {modalOpen && (
        <Modal
          title={method === "bkash" ? "bKash Payment" : "Nagad Payment"}
          onClose={() => setModalOpen(false)}
        >
          <div
            className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
            style={{ boxShadow: fieldShadow }}
          >
            <div
              className="rounded-[10px] border border-[#60a5fa]/20 bg-[linear-gradient(180deg,#10203f_0%,#0f1a33_100%)] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#93c5fd]">
                {methodLabel}
              </p>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-extrabold tracking-wide text-white sm:text-2xl">
                    {merchantNumber}
                  </p>
                </div>

                <CopyButton text={merchantNumber} />
              </div>
            </div>

            <div
              className="mt-3 rounded-md border border-white/10 bg-[#101d38] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
                Amount
              </p>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-xs text-white/45">৳</span>
                <span className="text-2xl font-semibold text-white">
                  {formatMoney(nAmount)}
                </span>
              </div>
            </div>

            <div
              className="mt-3 rounded-md border border-white/10 bg-[#101d38] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
                Sender Number
              </p>

              <div className="mt-2 flex items-center gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#0f1a33] text-[#60a5fa]"
                  style={{ boxShadow: fieldShadow }}
                >
                  <HiOutlinePhone className="text-base" />
                </div>

                <input
                  value={sender}
                  onChange={(e) => handleSenderChange(e.target.value)}
                  inputMode="numeric"
                  placeholder="01XXXXXXXXX"
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0f1a33] px-3 text-sm outline-none placeholder:text-white/35"
                  style={{ boxShadow: fieldShadow }}
                />
              </div>

              <p className="mt-2 text-[11px] text-white/45">
                Sender number must be 11 digits and start with 01
              </p>
            </div>

            <div
              className="mt-3 rounded-[10px] border border-[#60a5fa]/20 bg-[linear-gradient(180deg,#12315f_0%,#0f1d37_100%)] p-3"
              style={{ boxShadow: fieldShadow }}
            >
              <p className="text-center text-sm font-semibold leading-6 text-[#dbeafe]">
                Please send exactly{" "}
                <span className="font-extrabold text-white">৳{formatMoney(nAmount)}</span>{" "}
                to this number using{" "}
                <span className="font-extrabold text-[#60a5fa]">Send Money</span>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerifyDeposit}
            disabled={!canVerify}
            className={`mt-3 h-11 w-full rounded-md font-semibold text-white transition ${
              canVerify
                ? "bg-[#3b82f6] hover:brightness-[1.03] active:translate-y-[1px]"
                : "cursor-not-allowed bg-[#101d38] text-white/35"
            }`}
            style={{ boxShadow: canVerify ? btnShadow : fieldShadow }}
          >
            {submitting ? "Processing..." : "Verify"}
          </button>
        </Modal>
      )}
    </main>
  )
}

function DepositPageAnimations() {
  return (
    <style jsx global>{`
      @keyframes copyPulse {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.12);
        }
        100% {
          transform: scale(1);
        }
      }
    `}</style>
  )
}

function CopyButton({ text }) {
  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        textArea.remove()
      }

      toast.success("Copied successfully")
    } catch (error) {
      console.error("Copy failed:", error)
      toast.error("Copy failed")
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="copy-pulse flex h-10 items-center gap-1.5 rounded-md border border-emerald-300/20 bg-[#22c55e] px-3 text-xs font-semibold text-white transition hover:brightness-105"
      style={{
        boxShadow:
          "0 14px 24px rgba(34,197,94,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
        animation: "copyPulse 1.8s ease-in-out infinite",
      }}
    >
      <HiOutlineClipboardCopy className="text-sm" />
      Copy
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-3">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[360px] rounded-[10px] border border-white/10 bg-[#0a1428] p-4"
        style={{ boxShadow: "0 30px 120px rgba(0,0,0,.7)" }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">
            {title.split(" ")[0]}{" "}
            <span className="text-[#60a5fa]">
              {title.split(" ").slice(1).join(" ")}
            </span>
          </h3>

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

        <div className="mt-3">{children}</div>
      </div>
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
    <span className={`shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-semibold ${cls}`}>
      {capitalize(normalized)}
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

function capitalize(value) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD")
}