"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function PricingPage() {
  const router = useRouter()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [buying, setBuying] = useState(false)
  const [insufficientData, setInsufficientData] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadPlans() {
      try {
        setLoading(true)

        const res = await fetch("/api/pricing", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load pricing plans")
        }

        if (!ignore) {
          setPlans(Array.isArray(data?.packages) ? data.packages : [])
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load pricing plans")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadPlans()

    return () => {
      ignore = true
    }
  }, [])

  async function handleConfirmPurchase() {
    if (!selectedPlan || buying) return

    try {
      setBuying(true)

      const res = await fetch("/api/purchase-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: selectedPlan.id,
        }),
      })

      const data = await res.json()

      if (res.status === 401) {
        toast.error(data?.message || "Please login again")
        router.push("/users/login")
        return
      }

      if (!res.ok) {
        if (data?.code === "INSUFFICIENT_BALANCE") {
          setSelectedPlan(null)
          setInsufficientData({
            packageName: selectedPlan.packageName,
            requiredAmount: Number(data?.requiredAmount || selectedPlan.price || 0),
            currentBalance: Number(data?.currentBalance || 0),
            shortfall: Number(data?.shortfall || 0),
          })
          return
        }

        throw new Error(data?.message || "Failed to purchase package")
      }

      toast.success(data?.message || "Package purchased successfully")
      setSelectedPlan(null)

      window.setTimeout(() => {
        router.push(data?.redirectTo || "/users/accounts")
      }, 900)
    } catch (error) {
      toast.error(error.message || "Failed to purchase package")
    } finally {
      setBuying(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#081120] px-4 py-8 text-white sm:px-6">
      <PricingAnimations />

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

      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            PRICING PLANS
          </div>
        </div>

        {loading ? (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[10px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
                style={{ boxShadow: formShadow }}
              >
                <div className="h-[420px] animate-pulse rounded-[10px] bg-white/5" />
              </div>
            ))}
          </section>
        ) : plans.length === 0 ? (
          <section
            className="rounded-[10px] border border-white/10 bg-[#0a1428] p-6 text-center text-white/55"
            style={{ boxShadow: formShadow }}
          >
            No pricing plan found.
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onBuyNow={() => setSelectedPlan(plan)}
                disabled={buying}
              />
            ))}
          </section>
        )}
      </div>

      <PurchaseConfirmModal
        plan={selectedPlan}
        open={Boolean(selectedPlan)}
        buying={buying}
        onCancel={() => {
          if (!buying) {
            setSelectedPlan(null)
          }
        }}
        onConfirm={handleConfirmPurchase}
      />

      <InsufficientBalanceModal
        data={insufficientData}
        open={Boolean(insufficientData)}
        onClose={() => setInsufficientData(null)}
        onDeposit={() => {
          setInsufficientData(null)
          router.push("/users/deposit")
        }}
      />
    </main>
  )
}

function PricingAnimations() {
  return (
    <style jsx global>{`
      @keyframes pricePulse {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
        }
      }
    `}</style>
  )
}

function PlanCard({ plan, onBuyNow, disabled }) {
  return (
    <div
      className="rounded-[10px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
      style={{ boxShadow: formShadow }}
    >
      <div className="flex justify-end">
        <div
          className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
          style={{
            boxShadow:
              "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
          }}
        >
          {plan.packageName}
        </div>
      </div>

      <div className="mt-5 text-center">
        <div
          className="inline-flex items-end justify-center gap-1"
          style={{ animation: "pricePulse 2.2s ease-in-out infinite" }}
        >
          <span className="text-base text-white/45">৳</span>
          <span className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
            {formatMoney(plan.price)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <SummaryBadge
          label="Validity"
          value={`${plan.validityHours} Hours`}
          tone="blue"
        />
        <SummaryBadge
          label="Min Value"
          value={`৳${formatMoney(plan.minResourceValue)}`}
          tone="green"
        />
        <SummaryBadge
          label="Max Value"
          value={`৳${formatMoney(plan.maxResourceValue)}`}
          tone="amber"
        />
      </div>

      <div className="mt-5 space-y-3">
        {plan.packageResources.map((resource) => (
          <ResourceRow key={resource.id} resource={resource} />
        ))}
      </div>

      <button
        type="button"
        onClick={onBuyNow}
        disabled={disabled}
        className="mt-6 h-12 w-full rounded-md bg-[#3b82f6] font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
        style={{ boxShadow: btnShadow }}
      >
        Buy Now
      </button>
    </div>
  )
}

function SummaryBadge({ label, value, tone }) {
  const toneClass =
    tone === "green"
      ? "text-[#86efac]"
      : tone === "amber"
      ? "text-[#facc15]"
      : "text-[#93c5fd]"

  return (
    <div
      className="rounded-md border border-white/10 bg-[#0f1a33] px-2 py-3 text-center"
      style={{ boxShadow: fieldShadow }}
    >
      <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-white/45">
        {label}
      </p>
      <p className={`mt-2 break-words text-[11px] font-bold leading-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}

function ResourceRow({ resource }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0f1a33] px-3 py-3"
      style={{ boxShadow: fieldShadow }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-[#101d38] p-2"
          style={{ boxShadow: fieldShadow }}
        >
          <img
            src={resource.image}
            alt={resource.resourceName}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {resource.resourceName}
          </p>

          <div className="mt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45">Min Qty</span>
              <span className="rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-bold text-white">
                {resource.minQty}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/45">Max Qty</span>
              <span className="rounded-full bg-[#22c55e] px-2 py-0.5 text-[10px] font-bold text-white">
                {resource.maxQty}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[11px] text-white/45">Min Price</span>
          <span className="text-[12px] font-bold text-[#86efac]">
            ৳{formatMoney(resource.minPrice)}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-end gap-2">
          <span className="text-[11px] text-white/45">Max Price</span>
          <span className="text-[12px] font-bold text-[#93c5fd]">
            ৳{formatMoney(resource.maxPrice)}
          </span>
        </div>
      </div>
    </div>
  )
}

function PurchaseConfirmModal({ open, plan, buying, onCancel, onConfirm }) {
  if (!open || !plan) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-[10px] border border-white/10 bg-[#0a1428] p-5 text-white sm:p-6"
        style={{ boxShadow: formShadow }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-[11px] font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            PURCHASE CONFIRMATION
          </div>
        </div>

        <h3 className="text-xl font-semibold sm:text-2xl">
          Do you want to purchase this <span className="text-[#60a5fa]">package</span>?
        </h3>

        <div
          className="mt-4 rounded-[10px] border border-white/10 bg-[#0f1a33] p-4"
          style={{ boxShadow: fieldShadow }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/60">Package</span>
            <span className="text-sm font-semibold text-white">{plan.packageName}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-white/60">Amount</span>
            <span className="text-base font-extrabold text-[#86efac]">
              ৳{formatMoney(plan.price)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/72">
            BDT {formatMoney(plan.price)} will be deducted from your deposit balance
            after confirmation.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={buying}
            className="h-12 rounded-md border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ boxShadow: fieldShadow }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={buying}
            className="h-12 rounded-md bg-[#3b82f6] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ boxShadow: btnShadow }}
          >
            {buying ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  )
}

function InsufficientBalanceModal({ open, data, onClose, onDeposit }) {
  if (!open || !data) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[10px] border border-white/10 bg-[#0a1428] p-5 text-white sm:p-6"
        style={{ boxShadow: formShadow }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#ef4444] px-4 py-1.5 text-[11px] font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(239,68,68,.24), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            INSUFFICIENT BALANCE
          </div>
        </div>

        <h3 className="text-xl font-semibold sm:text-2xl">
          Your deposit balance is <span className="text-[#fca5a5]">not enough</span>
        </h3>

        <div
          className="mt-4 rounded-[10px] border border-white/10 bg-[#0f1a33] p-4"
          style={{ boxShadow: fieldShadow }}
        >
          <p className="text-sm leading-6 text-white/72">
            You do not have enough deposit balance to purchase the{" "}
            <span className="font-semibold text-white">{data.packageName}</span> package.
          </p>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Current Balance</span>
              <span className="text-sm font-bold text-[#fca5a5]">
                ৳{formatMoney(data.currentBalance)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Required Amount</span>
              <span className="text-sm font-bold text-[#86efac]">
                ৳{formatMoney(data.requiredAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Need More</span>
              <span className="text-sm font-bold text-[#facc15]">
                ৳{formatMoney(data.shortfall)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-md border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:bg-white/10"
            style={{ boxShadow: fieldShadow }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDeposit}
            className="h-12 rounded-md bg-[#22c55e] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px]"
            style={{
              boxShadow:
                "0 12px 22px rgba(34,197,94,.22), inset 1px 1px 0 rgba(255,255,255,.14), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            Deposit Now
          </button>
        </div>
      </div>
    </div>
  )
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}