"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
} from "react-icons/hi"
import { FaWhatsapp } from "react-icons/fa"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const cardShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const whatsappShadow =
  "0 14px 28px rgba(34,197,94,.24), inset 1px 1px 0 rgba(255,255,255,.18), inset -2px -2px 0 rgba(0,0,0,.14)"

export default function LoginPage() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supportLoading, setSupportLoading] = useState(true)
  const [supportNumber, setSupportNumber] = useState("")
  const [form, setForm] = useState({ phone: "", password: "" })

  useEffect(() => {
    let ignore = false

    async function loadSupportDetails() {
      try {
        setSupportLoading(true)

        const res = await fetch("/api/support-details", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load support details")
        }

        if (!ignore) {
          setSupportNumber(String(data?.forgotPasswordNumber || "").trim())
        }
      } catch {
        if (!ignore) {
          setSupportNumber("")
        }
      } finally {
        if (!ignore) {
          setSupportLoading(false)
        }
      }
    }

    loadSupportDetails()

    return () => {
      ignore = true
    }
  }, [])

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    const mobile = form.phone.trim()
    const password = form.password

    if (!/^01\d{9}$/.test(mobile)) {
      toast.error("মোবাইল নাম্বার ঠিক নয়")
      return
    }

    if (!password || password.length < 8) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে")
      return
    }

    try {
      setLoading(true)

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mobile,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data?.message || "লগইন ব্যর্থ")
        return
      }

      toast.success(data?.message || "লগইন সফল")
      router.replace("/users/dashboard")
      router.refresh()
    } catch {
      toast.error("সার্ভার এরর")
    } finally {
      setLoading(false)
    }
  }

  const whatsappLink = useMemo(() => {
    const normalized = normalizeWhatsappNumber(supportNumber)

    if (!normalized) {
      return ""
    }

    const whatsappMessage = encodeURIComponent(
      `Hello Support,\nI forgot my password.\nPlease help me recover my account.\nMobile Number: ${form.phone || ""}`
    )

    return `https://wa.me/${normalized}?text=${whatsappMessage}`
  }, [supportNumber, form.phone])

  const handleSupportClick = (e) => {
    if (whatsappLink) {
      return
    }

    e.preventDefault()

    if (supportLoading) {
      toast.error("Support number is loading")
      return
    }

    toast.error("WhatsApp support number is not available")
  }

  const supportText = supportLoading
    ? "Loading support..."
    : supportNumber || "Support unavailable"

  return (
    <main className="relative h-screen overflow-hidden bg-[#081120] px-4 py-4 text-white sm:px-6">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0f1a33",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.08)",
          },
        }}
      />

      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-3 flex justify-start">
            <div
              className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
              style={{
                boxShadow:
                  "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
              }}
            >
              WELCOME BACK
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-[28px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
            style={{ boxShadow: cardShadow }}
          >
            <h1 className="text-3xl font-semibold">
              <span className="text-[#60a5fa]">Login</span>
            </h1>

            <div className="mt-5 space-y-3">
              <div
                className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlinePhone className="shrink-0 text-[#60a5fa]" />
                <input
                  value={form.phone}
                  onChange={(e) => onChange("phone", e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                  placeholder="Mobile number"
                  type="tel"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>

              <div
                className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlineLockClosed className="shrink-0 text-[#60a5fa]" />
                <input
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                  placeholder="Password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="shrink-0 text-white/50 transition hover:text-white"
                  aria-label={show ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {show ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-[#3b82f6] font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  boxShadow:
                    "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)",
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <div className="text-center text-[13px] text-white/60">
                Don&apos;t have an account?{" "}
                <Link
                  href="/users/signup"
                  className="font-medium text-[#60a5fa] transition hover:text-[#93c5fd]"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>

      <a
        href={whatsappLink || "#"}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleSupportClick}
        className={`group fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-full border border-white/10 px-3 py-2 text-white transition-all duration-300 active:scale-95 ${
          whatsappLink
            ? "bg-[#22c55e] hover:scale-[1.03]"
            : "bg-[#1f2937]"
        }`}
        style={{ boxShadow: whatsappShadow }}
        aria-label="Contact support on WhatsApp"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
          <FaWhatsapp className="text-xl" />
        </span>

        <div className="pr-0.5 leading-tight">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80">
            Forgot Password?
          </p>
          <p className="text-[12px] font-semibold">WhatsApp Support</p>
          <p className="mt-0.5 text-[10px] text-white/75">{supportText}</p>
        </div>
      </a>
    </main>
  )
}

function normalizeWhatsappNumber(value) {
  const onlyDigits = String(value || "").replace(/\D/g, "")

  if (/^8801\d{9}$/.test(onlyDigits)) {
    return onlyDigits
  }

  if (/^01\d{9}$/.test(onlyDigits)) {
    return `88${onlyDigits}`
  }

  return ""
}
