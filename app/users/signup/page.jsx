"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import confetti from "canvas-confetti"
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineTag,
} from "react-icons/hi"

const fields = [
  {
    key: "name",
    placeholder: "Fullname",
    type: "text",
    autoComplete: "name",
    Icon: HiOutlineUser,
  },
  {
    key: "phone",
    placeholder: "Mobile number",
    type: "tel",
    autoComplete: "tel",
    Icon: HiOutlinePhone,
  },
  {
    key: "refer",
    placeholder: "Refer code (optional)",
    type: "text",
    autoComplete: "off",
    Icon: HiOutlineTag,
  },
]

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

function fireConfetti() {
  const end = Date.now() + 3000
  const colors = ["#60a5fa", "#3b82f6", "#93c5fd", "#ffffff", "#bfdbfe"]

  const shoot = (options) => {
    confetti({
      disableForReducedMotion: true,
      zIndex: 9999,
      colors,
      ...options,
    })
  }

  shoot({
    particleCount: 180,
    spread: 120,
    startVelocity: 52,
    scalar: 1.25,
    ticks: 220,
    origin: { x: 0.5, y: 0.62 },
  })

  shoot({
    particleCount: 90,
    angle: 60,
    spread: 85,
    startVelocity: 60,
    scalar: 1.1,
    ticks: 220,
    origin: { x: 0, y: 0.72 },
  })

  shoot({
    particleCount: 90,
    angle: 120,
    spread: 85,
    startVelocity: 60,
    scalar: 1.1,
    ticks: 220,
    origin: { x: 1, y: 0.72 },
  })

  const interval = setInterval(() => {
    const timeLeft = end - Date.now()

    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const progress = timeLeft / 3000
    const particleCount = Math.max(8, Math.floor(24 * progress))

    shoot({
      particleCount,
      angle: 60,
      spread: 70,
      startVelocity: 42,
      ticks: 180,
      scalar: 0.95,
      origin: { x: 0.02, y: 0.72 },
    })

    shoot({
      particleCount,
      angle: 120,
      spread: 70,
      startVelocity: 42,
      ticks: 180,
      scalar: 0.95,
      origin: { x: 0.98, y: 0.72 },
    })

    shoot({
      particleCount: 10,
      spread: 360,
      startVelocity: 18,
      ticks: 200,
      scalar: 0.75,
      origin: {
        x: 0.35 + Math.random() * 0.3,
        y: 0.18 + Math.random() * 0.18,
      },
    })
  }, 180)
}

export default function SignUpPage() {
  const router = useRouter()
  const timerRef = useRef(null)

  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    refer: "",
    password: "",
  })

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const onChange = (key, value) => {
    if (key === "phone") {
      value = value.replace(/\D/g, "").slice(0, 11)
    }

    if (key === "refer") {
      value = value.toUpperCase()
    }

    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    if (form.name.trim().length < 3) {
      toast.error("নাম কমপক্ষে ৩ অক্ষর হতে হবে")
      return false
    }

    if (!/^01\d{9}$/.test(form.phone.trim())) {
      toast.error("মোবাইল নাম্বার ১১ সংখ্যার হতে হবে এবং 01 দিয়ে শুরু হতে হবে")
      return false
    }

    if (form.password.length < 8) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে")
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return

    if (!validate()) return

    try {
      setLoading(true)

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.name.trim(),
          mobile: form.phone.trim(),
          password: form.password,
          referCode: form.refer.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data?.message || "সাইন আপ হয়নি")
        return
      }

      toast.success(data?.message || "একাউন্ট সফলভাবে তৈরি হয়েছে")
      fireConfetti()

      timerRef.current = setTimeout(() => {
        router.replace("/dashboard")
        router.refresh()
      }, 2400)
    } catch {
      toast.error("কিছু সমস্যা হয়েছে")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-[100svh] overflow-hidden bg-[#081120] text-white flex items-center justify-center px-4 sm:px-6">
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

      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            NEW ACCOUNT
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-6 sm:p-7"
          style={{
            boxShadow:
              "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)",
          }}
        >
          <h1 className="text-3xl font-semibold">
            Create <span className="text-[#60a5fa]">Account</span>
          </h1>

          <div className="mt-6 space-y-3">
            {fields.map(({ key, placeholder, type, autoComplete, Icon }) => (
              <div
                key={key}
                className="h-12 rounded-md border border-white/10 bg-[#0f1a33] px-4 flex items-center gap-3"
                style={{ boxShadow: fieldShadow }}
              >
                <Icon className="text-[#60a5fa] shrink-0" />
                <input
                  value={form[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-white/35"
                  placeholder={placeholder}
                  type={type}
                  autoComplete={autoComplete}
                />
              </div>
            ))}

            <div
              className="h-12 rounded-md border border-white/10 bg-[#0f1a33] px-4 flex items-center gap-3"
              style={{ boxShadow: fieldShadow }}
            >
              <HiOutlineLockClosed className="text-[#60a5fa] shrink-0" />
              <input
                value={form.password}
                onChange={(e) => onChange("password", e.target.value)}
                className="w-full bg-transparent outline-none text-sm placeholder:text-white/35"
                placeholder="Password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="text-white/50 hover:text-white transition shrink-0"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <HiOutlineEyeOff /> : <HiOutlineEye />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-md bg-[#3b82f6] font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:opacity-70"
              style={{
                boxShadow:
                  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)",
              }}
            >
              {loading ? "Loading..." : "Sign Up"}
            </button>

            <div className="text-center text-xs text-white/55">
              Already have an account?{" "}
              <Link href="/users/login" className="text-[#60a5fa] text-[14px] transition">
                Sign In
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}