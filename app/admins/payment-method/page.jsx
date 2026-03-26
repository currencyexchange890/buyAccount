"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineDeviceMobile,
  HiOutlineCash,
  HiOutlinePencil,
  HiOutlineRefresh,
} from "react-icons/hi"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const cardShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

function isValidMobile(value) {
  return /^01\d{9}$/.test((value || "").trim())
}

export default function PaymentMethodPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    bkashNumber: "",
    nagadNumber: "",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleNumberChange = (key, value) => {
    const cleanValue = String(value).replace(/\D/g, "").slice(0, 11)
    onChange(key, cleanValue)
  }

  useEffect(() => {
    const loadPaymentMethod = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/payment-method", {
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
          toast.error(data?.message || "Failed to load payment method")
          return
        }

        setForm({
          bkashNumber: data?.bkashNumber || "",
          nagadNumber: data?.nagadNumber || "",
        })

        setHasExisting(!!data?.exists)
        setEditing(!data?.exists)
      } catch {
        toast.error("Failed to load payment method")
      } finally {
        setLoading(false)
      }
    }

    loadPaymentMethod()
  }, [router])

  const isBkashValid = isValidMobile(form.bkashNumber)
  const isNagadValid = isValidMobile(form.nagadNumber)

  const canSave = useMemo(() => {
    return editing && isBkashValid && isNagadValid && !saving
  }, [editing, isBkashValid, isNagadValid, saving])

  const handleSave = async (e) => {
    e.preventDefault()

    if (!canSave) return

    try {
      setSaving(true)

      const res = await fetch("/api/admin/payment-method", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bkashNumber: form.bkashNumber,
          nagadNumber: form.nagadNumber,
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
        toast.error(data?.message || "Failed to save payment method")
        return
      }

      setForm({
        bkashNumber: data.bkashNumber || "",
        nagadNumber: data.nagadNumber || "",
      })
      setHasExisting(true)
      setEditing(false)
      toast.success(data?.message || "Payment method saved successfully")
    } catch {
      toast.error("Failed to save payment method")
    } finally {
      setSaving(false)
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

      <div className="mx-auto w-full max-w-xl">
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
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/45">Manage payment numbers</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                Payment <span className="text-[#60a5fa]">Method</span>
              </h1>
            </div>

            {hasExisting && !editing && !loading && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-10 items-center gap-2 rounded-md bg-[#3b82f6] px-4 text-sm font-semibold text-white"
                style={{ boxShadow: btnShadow }}
              >
                <HiOutlinePencil className="text-base" />
                Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Bkash Number
              </label>
              <div
                className="flex h-12 items-center gap-3 rounded-md border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlineDeviceMobile className="shrink-0 text-[#60a5fa]" />
                <input
                  type="number"
                  value={form.bkashNumber}
                  onChange={(e) => handleNumberChange("bkashNumber", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="01XXXXXXXXX"
                  disabled={loading || !editing || saving}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
                />
              </div>
              <p
                className={`mt-2 text-[12px] ${
                  !form.bkashNumber
                    ? "text-white/35"
                    : isBkashValid
                    ? "text-[#4ade80]"
                    : "text-[#f87171]"
                }`}
              >
                Must start with 01 and be exactly 11 digits
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Nagad Number
              </label>
              <div
                className="flex h-12 items-center gap-3 rounded-md border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlineCash className="shrink-0 text-[#60a5fa]" />
                <input
                  type="number"
                  value={form.nagadNumber}
                  onChange={(e) => handleNumberChange("nagadNumber", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="01XXXXXXXXX"
                  disabled={loading || !editing || saving}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
                />
              </div>
              <p
                className={`mt-2 text-[12px] ${
                  !form.nagadNumber
                    ? "text-white/35"
                    : isNagadValid
                    ? "text-[#4ade80]"
                    : "text-[#f87171]"
                }`}
              >
                Must start with 01 and be exactly 11 digits
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSave}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3b82f6] font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ boxShadow: btnShadow }}
            >
              <HiOutlineRefresh className="text-base" />
              {saving
                ? "Saving..."
                : hasExisting
                ? "Update Payment Method"
                : "Save Payment Method"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}