"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlinePhone,
  HiOutlineLink,
  HiOutlineChatAlt2,
  HiOutlineRefresh,
  HiOutlinePencil,
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

export default function SupportSetupPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    forgotPasswordNumber: "",
    telegramGroupLink: "",
    customerCareLink: "",
  })

  const [originalForm, setOriginalForm] = useState({
    forgotPasswordNumber: "",
    telegramGroupLink: "",
    customerCareLink: "",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  const [editing, setEditing] = useState({
    forgotPasswordNumber: false,
    telegramGroupLink: false,
    customerCareLink: false,
  })

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleNumberChange = (value) => {
    const cleanValue = String(value).replace(/\D/g, "").slice(0, 11)
    onChange("forgotPasswordNumber", cleanValue)
  }

  const enableEdit = (key) => {
    setEditing((prev) => ({ ...prev, [key]: true }))
  }

  useEffect(() => {
    const loadSupportDetails = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/support-details", {
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
          toast.error(data?.message || "Failed to load support setup")
          return
        }

        const nextForm = {
          forgotPasswordNumber: data?.forgotPasswordNumber || "",
          telegramGroupLink: data?.telegramGroupLink || "",
          customerCareLink: data?.customerCareLink || "",
        }

        setForm(nextForm)
        setOriginalForm(nextForm)
        setHasExisting(!!data?.exists)

        if (!data?.exists) {
          setEditing({
            forgotPasswordNumber: true,
            telegramGroupLink: true,
            customerCareLink: true,
          })
        }
      } catch {
        toast.error("Failed to load support setup")
      } finally {
        setLoading(false)
      }
    }

    loadSupportDetails()
  }, [router])

  const isForgotPasswordValid = isValidMobile(form.forgotPasswordNumber)

  const isDirty =
    form.forgotPasswordNumber !== originalForm.forgotPasswordNumber ||
    form.telegramGroupLink !== originalForm.telegramGroupLink ||
    form.customerCareLink !== originalForm.customerCareLink

  const isAnyEditing =
    editing.forgotPasswordNumber ||
    editing.telegramGroupLink ||
    editing.customerCareLink

  const canSave = useMemo(() => {
    return isAnyEditing && isDirty && isForgotPasswordValid && !saving
  }, [isAnyEditing, isDirty, isForgotPasswordValid, saving])

  const handleSave = async (e) => {
    e.preventDefault()

    if (!canSave) return

    try {
      setSaving(true)

      const res = await fetch("/api/admin/support-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          forgotPasswordNumber: form.forgotPasswordNumber,
          telegramGroupLink: form.telegramGroupLink,
          customerCareLink: form.customerCareLink,
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
        toast.error(data?.message || "Failed to save support setup")
        return
      }

      const nextForm = {
        forgotPasswordNumber: data?.forgotPasswordNumber || "",
        telegramGroupLink: data?.telegramGroupLink || "",
        customerCareLink: data?.customerCareLink || "",
      }

      setForm(nextForm)
      setOriginalForm(nextForm)
      setHasExisting(true)
      setEditing({
        forgotPasswordNumber: false,
        telegramGroupLink: false,
        customerCareLink: false,
      })

      toast.success(data?.message || "Support setup saved successfully")
    } catch {
      toast.error("Failed to save support setup")
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

      <div className="mx-auto w-full max-w-3xl">
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
          <div className="mb-5">
            <p className="text-xs font-medium text-white/45">
              Manage support contact settings
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Support <span className="text-[#60a5fa]">Setup</span>
            </h1>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Forgot Password Number
              </label>
              <div
                className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlinePhone className="shrink-0 text-[#60a5fa]" />
                <input
                  type="number"
                  value={form.forgotPasswordNumber}
                  onChange={(e) => handleNumberChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="01XXXXXXXXX"
                  disabled={loading || !editing.forgotPasswordNumber || saving}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
                />

                {hasExisting && !editing.forgotPasswordNumber && !loading && (
                  <button
                    type="button"
                    onClick={() => enableEdit("forgotPasswordNumber")}
                    className="shrink-0 text-[#60a5fa]"
                  >
                    <HiOutlinePencil className="text-[18px]" />
                  </button>
                )}
              </div>

              <p
                className={`mt-2 text-[12px] ${
                  !form.forgotPasswordNumber
                    ? "text-white/35"
                    : isForgotPasswordValid
                    ? "text-[#4ade80]"
                    : "text-[#f87171]"
                }`}
              >
                Must start with 01 and be exactly 11 digits
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Telegram Group Link
              </label>
              <div
                className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlineChatAlt2 className="shrink-0 text-[#60a5fa]" />
                <input
                  type="text"
                  value={form.telegramGroupLink}
                  onChange={(e) => onChange("telegramGroupLink", e.target.value)}
                  placeholder="Telegram Group Link"
                  disabled={loading || !editing.telegramGroupLink || saving}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
                />

                {hasExisting && !editing.telegramGroupLink && !loading && (
                  <button
                    type="button"
                    onClick={() => enableEdit("telegramGroupLink")}
                    className="shrink-0 text-[#60a5fa]"
                  >
                    <HiOutlinePencil className="text-[18px]" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/80">
                Customer Care Link
              </label>
              <div
                className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#0f1a33] px-4"
                style={{ boxShadow: fieldShadow }}
              >
                <HiOutlineLink className="shrink-0 text-[#60a5fa]" />
                <input
                  type="text"
                  value={form.customerCareLink}
                  onChange={(e) => onChange("customerCareLink", e.target.value)}
                  placeholder="Customer Care Link"
                  disabled={loading || !editing.customerCareLink || saving}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
                />

                {hasExisting && !editing.customerCareLink && !loading && (
                  <button
                    type="button"
                    onClick={() => enableEdit("customerCareLink")}
                    className="shrink-0 text-[#60a5fa]"
                  >
                    <HiOutlinePencil className="text-[18px]" />
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSave}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ boxShadow: btnShadow }}
            >
              <HiOutlineRefresh className="text-base" />
              {saving
                ? "Saving..."
                : hasExisting
                ? "Update Setup"
                : "Save Setup"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}