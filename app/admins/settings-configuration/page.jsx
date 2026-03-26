"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineCash,
  HiOutlineCreditCard,
  HiOutlineRefresh,
  HiOutlinePencil,
} from "react-icons/hi"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const cardShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function SettingsConfigurationPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    dailyWithdrawCount: "0",
    dailyMaxWithdraw: "0",
    minimumDeposit: "0",
    minimumWithdraw: "0",
    withdrawFee: "0",
    fastReferBonus: "0",
    regularReferBonus: "0",
    coolDown: "30",
    taps: "300",
  })

  const [originalForm, setOriginalForm] = useState({
    dailyWithdrawCount: "0",
    dailyMaxWithdraw: "0",
    minimumDeposit: "0",
    minimumWithdraw: "0",
    withdrawFee: "0",
    fastReferBonus: "0",
    regularReferBonus: "0",
    coolDown: "30",
    taps: "300",
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)

  const [editing, setEditing] = useState({
    dailyWithdrawCount: false,
    dailyMaxWithdraw: false,
    minimumDeposit: false,
    minimumWithdraw: false,
    withdrawFee: false,
    fastReferBonus: false,
    regularReferBonus: false,
    coolDown: false,
    taps: false,
  })

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const enableEdit = (key) => {
    setEditing((prev) => ({ ...prev, [key]: true }))
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/settings-config", {
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
          toast.error(data?.message || "Failed to load settings")
          return
        }

        const nextForm = {
          dailyWithdrawCount: String(data?.dailyWithdrawCount ?? 0),
          dailyMaxWithdraw: String(data?.dailyMaxWithdraw ?? 0),
          minimumDeposit: String(data?.minimumDeposit ?? 0),
          minimumWithdraw: String(data?.minimumWithdraw ?? 0),
          withdrawFee: String(data?.withdrawFee ?? 0),
          fastReferBonus: String(data?.fastReferBonus ?? 0),
          regularReferBonus: String(data?.regularReferBonus ?? 0),
          coolDown: String(data?.coolDown ?? 30),
          taps: String(data?.taps ?? 300),
        }

        setForm(nextForm)
        setOriginalForm(nextForm)
        setHasExisting(!!data?.exists)

        if (!data?.exists) {
          setEditing({
            dailyWithdrawCount: true,
            dailyMaxWithdraw: true,
            minimumDeposit: true,
            minimumWithdraw: true,
            withdrawFee: true,
            fastReferBonus: true,
            regularReferBonus: true,
            coolDown: true,
            taps: true,
          })
        }
      } catch {
        toast.error("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [router])

  const isDirty =
    form.dailyWithdrawCount !== originalForm.dailyWithdrawCount ||
    form.dailyMaxWithdraw !== originalForm.dailyMaxWithdraw ||
    form.minimumDeposit !== originalForm.minimumDeposit ||
    form.minimumWithdraw !== originalForm.minimumWithdraw ||
    form.withdrawFee !== originalForm.withdrawFee ||
    form.fastReferBonus !== originalForm.fastReferBonus ||
    form.regularReferBonus !== originalForm.regularReferBonus ||
    form.coolDown !== originalForm.coolDown ||
    form.taps !== originalForm.taps

  const isAnyEditing =
    editing.dailyWithdrawCount ||
    editing.dailyMaxWithdraw ||
    editing.minimumDeposit ||
    editing.minimumWithdraw ||
    editing.withdrawFee ||
    editing.fastReferBonus ||
    editing.regularReferBonus ||
    editing.coolDown ||
    editing.taps

  const isValid =
    Number(form.dailyWithdrawCount) >= 0 &&
    Number(form.dailyMaxWithdraw) >= 0 &&
    Number(form.minimumDeposit) >= 0 &&
    Number(form.minimumWithdraw) >= 0 &&
    Number(form.withdrawFee) >= 0 &&
    Number(form.fastReferBonus) >= 0 &&
    Number(form.regularReferBonus) >= 0 &&
    Number(form.coolDown) > 0 &&
    Number(form.taps) > 0 &&
    form.dailyWithdrawCount !== "" &&
    form.dailyMaxWithdraw !== "" &&
    form.minimumDeposit !== "" &&
    form.minimumWithdraw !== "" &&
    form.withdrawFee !== "" &&
    form.fastReferBonus !== "" &&
    form.regularReferBonus !== "" &&
    form.coolDown !== "" &&
    form.taps !== ""

  const canSave = useMemo(() => {
    return isAnyEditing && isDirty && isValid && !saving
  }, [isAnyEditing, isDirty, isValid, saving])

  const handleSave = async (e) => {
    e.preventDefault()

    if (!canSave) return

    try {
      setSaving(true)

      const res = await fetch("/api/admin/settings-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          dailyWithdrawCount: Number(form.dailyWithdrawCount),
          dailyMaxWithdraw: Number(form.dailyMaxWithdraw),
          minimumDeposit: Number(form.minimumDeposit),
          minimumWithdraw: Number(form.minimumWithdraw),
          withdrawFee: Number(form.withdrawFee),
          fastReferBonus: Number(form.fastReferBonus),
          regularReferBonus: Number(form.regularReferBonus),
          coolDown: Number(form.coolDown),
          taps: Number(form.taps),
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
        toast.error(data?.message || "Failed to save settings")
        return
      }

      const nextForm = {
        dailyWithdrawCount: String(data?.dailyWithdrawCount ?? 0),
        dailyMaxWithdraw: String(data?.dailyMaxWithdraw ?? 0),
        minimumDeposit: String(data?.minimumDeposit ?? 0),
        minimumWithdraw: String(data?.minimumWithdraw ?? 0),
        withdrawFee: String(data?.withdrawFee ?? 0),
        fastReferBonus: String(data?.fastReferBonus ?? 0),
        regularReferBonus: String(data?.regularReferBonus ?? 0),
        coolDown: String(data?.coolDown ?? 30),
        taps: String(data?.taps ?? 300),
      }

      setForm(nextForm)
      setOriginalForm(nextForm)
      setHasExisting(true)
      setEditing({
        dailyWithdrawCount: false,
        dailyMaxWithdraw: false,
        minimumDeposit: false,
        minimumWithdraw: false,
        withdrawFee: false,
        fastReferBonus: false,
        regularReferBonus: false,
        coolDown: false,
        taps: false,
      })

      toast.success(data?.message || "Settings configuration saved successfully")
    } catch {
      toast.error("Failed to save settings")
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
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="mb-5">
            <p className="text-xs font-medium text-white/45">
              Manage app configuration settings
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Settings <span className="text-[#60a5fa]">Configuration</span>
            </h1>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldCard
                tag="Count"
                value={form.dailyWithdrawCount}
                onChange={(value) => onChange("dailyWithdrawCount", value)}
                placeholder="3"
                loading={loading}
                saving={saving}
                editable={editing.dailyWithdrawCount}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("dailyWithdrawCount")}
                icon={<HiOutlineCreditCard className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Daily Max"
                value={form.dailyMaxWithdraw}
                onChange={(value) => onChange("dailyMaxWithdraw", value)}
                placeholder="5000"
                loading={loading}
                saving={saving}
                editable={editing.dailyMaxWithdraw}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("dailyMaxWithdraw")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Min Deposit"
                value={form.minimumDeposit}
                onChange={(value) => onChange("minimumDeposit", value)}
                placeholder="100"
                loading={loading}
                saving={saving}
                editable={editing.minimumDeposit}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("minimumDeposit")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Min Withdraw"
                value={form.minimumWithdraw}
                onChange={(value) => onChange("minimumWithdraw", value)}
                placeholder="100"
                loading={loading}
                saving={saving}
                editable={editing.minimumWithdraw}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("minimumWithdraw")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Fee"
                value={form.withdrawFee}
                onChange={(value) => onChange("withdrawFee", value)}
                placeholder="10"
                loading={loading}
                saving={saving}
                editable={editing.withdrawFee}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("withdrawFee")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Fast Bonus"
                value={form.fastReferBonus}
                onChange={(value) => onChange("fastReferBonus", value)}
                placeholder="50"
                loading={loading}
                saving={saving}
                editable={editing.fastReferBonus}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("fastReferBonus")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Regular Bonus"
                value={form.regularReferBonus}
                onChange={(value) => onChange("regularReferBonus", value)}
                placeholder="20"
                loading={loading}
                saving={saving}
                editable={editing.regularReferBonus}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("regularReferBonus")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Cool Down (min)"
                value={form.coolDown}
                onChange={(value) => onChange("coolDown", value)}
                placeholder="30"
                loading={loading}
                saving={saving}
                editable={editing.coolDown}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("coolDown")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />

              <FieldCard
                tag="Taps"
                value={form.taps}
                onChange={(value) => onChange("taps", value)}
                placeholder="300"
                loading={loading}
                saving={saving}
                editable={editing.taps}
                hasExisting={hasExisting}
                onEdit={() => enableEdit("taps")}
                icon={<HiOutlineCash className="shrink-0 text-[#60a5fa]" />}
              />
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
                ? "Update Settings"
                : "Save Settings"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

function FieldCard({
  tag,
  value,
  onChange,
  placeholder,
  loading,
  saving,
  editable,
  hasExisting,
  onEdit,
  icon,
}) {
  return (
    <div
      className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-2.5"
      style={{ boxShadow: fieldShadow }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="inline-flex rounded-full bg-[#3b82f6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
          style={{
            boxShadow:
              "0 8px 18px rgba(59,130,246,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.12)",
          }}
        >
          {tag}
        </span>

        {hasExisting && !editable && !loading && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 text-[#60a5fa]"
          >
            <HiOutlinePencil className="text-[17px]" />
          </button>
        )}
      </div>

      <div
        className="flex h-11 items-center gap-2 rounded-md border border-white/10 bg-[#101a31] px-3"
        style={{ boxShadow: fieldShadow }}
      >
        {icon}
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={loading || !editable || saving}
          className="w-full bg-transparent text-sm outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
        />
      </div>
    </div>
  )
}