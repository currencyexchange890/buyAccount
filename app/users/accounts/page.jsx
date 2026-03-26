"use client"

import { useEffect, useMemo, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { HiOutlineUser, HiOutlineLockClosed } from "react-icons/hi"

const shellShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const cardShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let ignore = false

    async function loadAccounts() {
      try {
        setLoading(true)

        const res = await fetch("/api/accounts", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (res.status === 401) {
          toast.error(data?.message || "Please login again")
          router.push("/users/login")
          return
        }

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load accounts")
        }

        if (!ignore) {
          setAccounts(Array.isArray(data?.accounts) ? data.accounts : [])
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load accounts")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadAccounts()

    return () => {
      ignore = true
    }
  }, [router])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const activeAccounts = useMemo(() => {
    return accounts.filter((item) => {
      const expireTime = new Date(item.expireAt).getTime()
      return Number.isFinite(expireTime) && expireTime > now
    })
  }, [accounts, now])

  async function handleCopy(text, label) {
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

      toast.success(`${label} copied successfully`)
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <main className="min-h-screen bg-[#081120] px-4 py-8 text-white sm:px-6">
      <AccountAnimations />

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

      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            ACCOUNTS
          </div>
        </div>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-5">
            <p className="text-xs font-medium text-white/45">
              Active account credentials with live expiry countdown
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              User <span className="text-[#60a5fa]">Accounts</span>
            </h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
                  style={{ boxShadow: cardShadow }}
                >
                  <div className="h-28 animate-pulse rounded-[10px] bg-white/5" />
                </div>
              ))}
            </div>
          ) : activeAccounts.length === 0 ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-6 text-center text-white/55"
              style={{ boxShadow: cardShadow }}
            >
              No active account found right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeAccounts.map((item, index) => (
                <CompactAccountCard
                  key={item.id}
                  index={index}
                  item={item}
                  now={now}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function CompactAccountCard({ item, index, now, onCopy }) {
  const countdown = getCountdownParts(item.expireAt, now)

  if (countdown.totalMs <= 0) {
    return null
  }

  return (
    <div
      className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 sm:p-3.5"
      style={{ boxShadow: cardShadow }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="rounded-full border border-white/10 bg-[#101a31] px-3 py-1 text-[11px] font-semibold text-[#93c5fd]">
          Account #{index + 1}
        </div>

        <div className="rounded-full border border-emerald-300/20 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-[#86efac]">
          Active
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <InfoRow
          icon={<HiOutlineUser className="text-[15px]" />}
          label="Username"
          value={item.username}
          onCopy={() => onCopy(item.username, "Username")}
        />

        <InfoRow
          icon={<HiOutlineLockClosed className="text-[15px]" />}
          label="Password"
          value={item.password}
          onCopy={() => onCopy(item.password, "Password")}
        />
      </div>

      <div
        className="mt-2.5 rounded-md border border-white/10 bg-[#101a31] px-3 py-3"
        style={{ boxShadow: cardShadow }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
            Expiry Countdown
          </p>
          <p className="text-[11px] font-semibold text-white/55">
            {formatDateTime(item.expireAt)}
          </p>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2">
          <CountdownUnit label="Days" value={countdown.days} />
          <CountdownUnit label="Hours" value={countdown.hours} />
          <CountdownUnit label="Min" value={countdown.minutes} />
          <CountdownUnit label="Sec" value={countdown.seconds} pulse />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, onCopy }) {
  return (
    <div
      className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2.5"
      style={{ boxShadow: cardShadow }}
    >
      <div className="mb-1 flex items-center gap-2 text-white/45">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[14px] font-bold tracking-[0.08em] text-white">
          {value}
        </p>

        <button
          type="button"
          onClick={onCopy}
          className="flex h-8 shrink-0 items-center rounded-md border border-emerald-300/20 bg-[#22c55e] px-3 text-[11px] font-semibold text-white transition hover:brightness-105"
          style={{
            boxShadow:
              "0 12px 22px rgba(34,197,94,.22), inset 1px 1px 0 rgba(255,255,255,.14), inset -1px -1px 0 rgba(0,0,0,.12)",
          }}
        >
          Copy
        </button>
      </div>
    </div>
  )
}

function CountdownUnit({ label, value, pulse = false }) {
  return (
    <div
      className={`rounded-md border border-white/10 bg-[#0f1a33] px-2 py-2.5 text-center ${pulse ? "countdown-pulse" : ""}`}
      style={{ boxShadow: cardShadow }}
    >
      <p className="text-[18px] font-extrabold leading-none text-[#93c5fd]">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
    </div>
  )
}

function AccountAnimations() {
  return (
    <style jsx global>{`
      @keyframes countdownPulse {
        0% {
          transform: translateY(0);
          box-shadow: 0 0 0 rgba(59, 130, 246, 0);
        }
        50% {
          transform: translateY(-1px);
          box-shadow: 0 0 18px rgba(59, 130, 246, 0.18);
        }
        100% {
          transform: translateY(0);
          box-shadow: 0 0 0 rgba(59, 130, 246, 0);
        }
      }

      .countdown-pulse {
        animation: countdownPulse 1s ease-in-out infinite;
      }
    `}</style>
  )
}

function getCountdownParts(expireAt, now) {
  const expireTime = new Date(expireAt).getTime()
  const totalMs = Math.max(0, expireTime - now)

  const totalSeconds = Math.floor(totalMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { totalMs, days, hours, minutes, seconds }
}

function formatDateTime(value) {
  if (!value) return "N/A"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "N/A"
  }

  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}