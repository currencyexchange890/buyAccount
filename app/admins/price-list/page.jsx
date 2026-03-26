"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineCollection,
} from "react-icons/hi"

const packageOptions = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Ruby",
  "Diamond",
  "Titanium",
  "Crystal",
  "Master",
  "Grandmaster",
  "Elite",
  "Champion",
  "Hero",
  "Epic",
  "Legend",
]

const shellShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const cardShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

function makeEmptyResourceRow() {
  return {
    rowId: Date.now() + Math.random(),
    fileName: "",
    minQty: "",
    maxQty: "",
  }
}

function sortResourcesByPrice(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const priceDiff = Number(a?.price || 0) - Number(b?.price || 0)

    if (priceDiff !== 0) {
      return priceDiff
    }

    return String(a?.name || a?.fileName || "").localeCompare(
      String(b?.name || b?.fileName || "")
    )
  })
}

function normalizePackages(items, priceMap) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    packageResources: sortPackageResources(item?.packageResources, priceMap),
  }))
}

function sortPackageResources(items, priceMap) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const aPrice = Number(priceMap?.get(a?.fileName)?.price || 0)
    const bPrice = Number(priceMap?.get(b?.fileName)?.price || 0)
    const priceDiff = aPrice - bPrice

    if (priceDiff !== 0) {
      return priceDiff
    }

    return String(a?.resourceName || a?.fileName || "").localeCompare(
      String(b?.resourceName || b?.fileName || "")
    )
  })
}

export default function PriceListPage() {
  const router = useRouter()

  const [resourceOptions, setResourceOptions] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [form, setForm] = useState({
    packageName: "Iron",
    price: "",
    validityHours: "",
    resources: [makeEmptyResourceRow()],
  })

  const sortedPackages = useMemo(() => {
    return [...packages].sort(
      (a, b) =>
        packageOptions.indexOf(a.packageName) - packageOptions.indexOf(b.packageName)
    )
  }, [packages])

  const sortedResourceOptions = useMemo(() => sortResourcesByPrice(resourceOptions), [resourceOptions])

  const priceMap = useMemo(() => {
    return new Map(
      sortedResourceOptions.map((item) => [
        item.fileName,
        {
          name: item.name,
          fileName: item.fileName,
          price: Number(item.price || 0),
          image: item.image,
        },
      ])
    )
  }, [sortedResourceOptions])

  const packageValueSummary = useMemo(() => {
    let minTotal = 0
    let maxTotal = 0

    for (const row of form.resources) {
      const resource = priceMap.get(row.fileName)
      const minQty = Number(row.minQty)
      const maxQty = Number(row.maxQty)

      if (!resource || !(minQty > 0) || !(maxQty > 0) || maxQty < minQty) {
        continue
      }

      minTotal += resource.price * minQty
      maxTotal += resource.price * maxQty
    }

    return {
      minTotal,
      maxTotal,
    }
  }, [form.resources, priceMap])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/price-list", {
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
          toast.error(data?.message || "Failed to load price list")
          return
        }

        const nextResourceOptions = sortResourcesByPrice(data?.resourceOptions || [])
        const nextPriceMap = new Map(
          nextResourceOptions.map((item) => [item.fileName, item])
        )

        setResourceOptions(nextResourceOptions)
        setPackages(normalizePackages(data?.packages || [], nextPriceMap))
      } catch {
        toast.error("Failed to load price list")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addResourceRow = () => {
    setForm((prev) => ({
      ...prev,
      resources: [...prev.resources, makeEmptyResourceRow()],
    }))
  }

  const selectResource = (rowId, fileName) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.map((row) =>
        row.rowId === rowId ? { ...row, fileName } : row
      ),
    }))
  }

  const changeResourceField = (rowId, key, value) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.map((row) =>
        row.rowId === rowId ? { ...row, [key]: value } : row
      ),
    }))
  }

  const removeResourceRow = (rowId) => {
    setForm((prev) => {
      const nextRows = prev.resources.filter((row) => row.rowId !== rowId)
      return {
        ...prev,
        resources: nextRows.length ? nextRows : [makeEmptyResourceRow()],
      }
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({
      packageName: "Iron",
      price: "",
      validityHours: "",
      resources: [makeEmptyResourceRow()],
    })
  }

  const buildPayloadResources = () => {
    return form.resources
      .filter((row) => {
        const min = Number(row.minQty)
        const max = Number(row.maxQty)
        return row.fileName && min > 0 && max > 0 && max >= min
      })
      .map((row) => ({
        fileName: row.fileName,
        minQty: Number(row.minQty),
        maxQty: Number(row.maxQty),
      }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.packageName) {
      toast.error("Select package name")
      return
    }

    if (!form.price || Number(form.price) <= 0) {
      toast.error("Enter valid price")
      return
    }

    if (!form.validityHours || Number(form.validityHours) <= 0) {
      toast.error("Enter valid validity hours")
      return
    }

    const packageResources = buildPayloadResources()

    if (!packageResources.length) {
      toast.error("Add at least one valid resource")
      return
    }

    try {
      setSaving(true)

      const res = await fetch("/api/admin/price-list", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: editingId || undefined,
          packageName: form.packageName,
          price: Number(form.price),
          validityHours: Number(form.validityHours),
          packageResources,
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
        toast.error(data?.message || "Failed to save package")
        return
      }

      setPackages(normalizePackages(data?.packages || [], priceMap))
      toast.success(data?.message || "Package saved successfully")
      resetForm()
    } catch {
      toast.error("Failed to save package")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setForm({
      packageName: item.packageName,
      price: item.price,
      validityHours: item.validityHours,
      resources: sortPackageResources(item.packageResources, priceMap).map((row) => ({
        rowId: Date.now() + Math.random() + row.fileName,
        fileName: row.fileName,
        minQty: row.minQty,
        maxQty: row.maxQty,
      })),
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setSaving(true)

      const res = await fetch("/api/admin/price-list", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: deleteTarget.id,
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
        toast.error(data?.message || "Failed to delete package")
        return
      }

      setPackages(normalizePackages(data?.packages || [], priceMap))
      if (editingId === deleteTarget.id) {
        resetForm()
      }
      setDeleteTarget(null)
      toast.success(data?.message || "Package deleted successfully")
    } catch {
      toast.error("Failed to delete package")
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
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-5">
            <p className="text-xs font-medium text-white/45">
              Create and manage package price list
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Price <span className="text-[#60a5fa]">List</span>
            </h1>
          </div>

          {loading ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              Loading price list...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white/80">
                  Package Name
                </label>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {packageOptions.map((name) => {
                    const selected = form.packageName === name

                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => onFormChange("packageName", name)}
                        className={`rounded-md border px-2 py-3 text-center text-[12px] font-semibold transition sm:text-[13px] ${
                          selected
                            ? "border-[#60a5fa] bg-[#13203e] text-[#60a5fa]"
                            : "border-white/10 bg-[#0f1a33] text-white/85 hover:border-white/15"
                        }`}
                        style={{ boxShadow: cardShadow }}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/80">
                    Price
                  </label>
                  <div
                    className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4"
                    style={{ boxShadow: cardShadow }}
                  >
                    <HiOutlineCash className="shrink-0 text-[#60a5fa]" />
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => onFormChange("price", e.target.value)}
                      placeholder="Enter price"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-white/80">
                    Validity Hours
                  </label>
                  <div
                    className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4"
                    style={{ boxShadow: cardShadow }}
                  >
                    <HiOutlineClock className="shrink-0 text-[#60a5fa]" />
                    <input
                      type="number"
                      min="1"
                      value={form.validityHours}
                      onChange={(e) => onFormChange("validityHours", e.target.value)}
                      placeholder="Enter hours"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                    />
                  </div>
                </div>
              </div>

              <div
                className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 sm:p-4"
                style={{ boxShadow: cardShadow }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Package Resources</p>
                    <p className="text-[12px] text-white/45">
                      Select image and set minimum / maximum quantity
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addResourceRow}
                    className="flex h-10 items-center gap-2 rounded-md bg-[#3b82f6] px-4 text-sm font-semibold text-white"
                    style={{ boxShadow: btnShadow }}
                  >
                    <HiOutlinePlus className="text-base" />
                    Add
                  </button>
                </div>

                <div className="space-y-4">
                  {form.resources.map((row, index) => {
                    const selectedResource = priceMap.get(row.fileName)
                    const rowMinQty = Number(row.minQty)
                    const rowMaxQty = Number(row.maxQty)
                    const rowMinValue =
                      selectedResource && rowMinQty > 0
                        ? selectedResource.price * rowMinQty
                        : 0
                    const rowMaxValue =
                      selectedResource && rowMaxQty > 0
                        ? selectedResource.price * rowMaxQty
                        : 0

                    return (
                      <div
                        key={row.rowId}
                        className="rounded-[10px] border border-white/10 bg-[#101a31] p-3"
                        style={{ boxShadow: cardShadow }}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              Resource Row {index + 1}
                            </p>
                            <p className="text-[12px] text-white/45">
                              Choose one image and quantity range
                            </p>
                          </div>

                          {form.resources.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeResourceRow(row.rowId)}
                              className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-[#1a2644] text-[#f87171]"
                              style={{ boxShadow: cardShadow }}
                            >
                              <HiOutlineTrash className="text-sm" />
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <div className="flex min-w-max gap-2 pb-2">
                            {sortedResourceOptions.map((resource) => {
                              const selected = row.fileName === resource.fileName

                              return (
                                <button
                                  key={resource.fileName}
                                  type="button"
                                  onClick={() => selectResource(row.rowId, resource.fileName)}
                                  className={`relative flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border p-1.5 transition sm:h-[72px] sm:w-[72px] ${
                                    selected
                                      ? "border-[#60a5fa] bg-[#13203e]"
                                      : "border-white/10 bg-[#0f1730]"
                                  }`}
                                  style={{ boxShadow: cardShadow }}
                                >
                                  <img
                                    src={resource.image}
                                    alt={resource.name}
                                    className="h-full w-full object-contain"
                                  />

                                  <span
                                    className="absolute left-1 top-1 rounded-full bg-[#22c55e] px-1.5 py-[2px] text-[9px] font-bold text-white"
                                    style={{
                                      boxShadow:
                                        "0 10px 18px rgba(34,197,94,.22), inset 1px 1px 0 rgba(255,255,255,.14), inset -1px -1px 0 rgba(0,0,0,.12)",
                                    }}
                                  >
                                    ৳{formatMoney(resource.price)}
                                  </span>

                                  {selected && (
                                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#22c55e] text-white shadow-lg sm:h-5 sm:w-5">
                                      <HiOutlineCheck className="text-[10px] sm:text-[11px]" />
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {selectedResource && (
                          <div
                            className="mt-2 rounded-md border border-[#22c55e]/20 bg-[#143222] px-3 py-2"
                            style={{ boxShadow: cardShadow }}
                          >
                            <p className="text-[12px] font-semibold text-[#bbf7d0]">
                              {selectedResource.name} price: ৳
                              {formatMoney(selectedResource.price)}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-white/80">
                              Minimum Quantity
                            </label>
                            <div
                              className="flex h-11 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4"
                              style={{ boxShadow: cardShadow }}
                            >
                              <HiOutlineCollection className="shrink-0 text-[#60a5fa]" />
                              <input
                                type="number"
                                min="1"
                                value={row.minQty}
                                onChange={(e) =>
                                  changeResourceField(row.rowId, "minQty", e.target.value)
                                }
                                placeholder="Min qty"
                                className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-white/80">
                              Maximum Quantity
                            </label>
                            <div
                              className="flex h-11 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4"
                              style={{ boxShadow: cardShadow }}
                            >
                              <HiOutlineCollection className="shrink-0 text-[#60a5fa]" />
                              <input
                                type="number"
                                min="1"
                                value={row.maxQty}
                                onChange={(e) =>
                                  changeResourceField(row.rowId, "maxQty", e.target.value)
                                }
                                placeholder="Max qty"
                                className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div
                            className="rounded-md border border-white/10 bg-[#0f1a33] px-4 py-3"
                            style={{ boxShadow: cardShadow }}
                          >
                            <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                              Row Minimum Value
                            </p>
                            <p className="mt-1 text-base font-extrabold text-[#facc15]">
                              ৳{formatMoney(rowMinValue)}
                            </p>
                          </div>

                          <div
                            className="rounded-md border border-white/10 bg-[#0f1a33] px-4 py-3"
                            style={{ boxShadow: cardShadow }}
                          >
                            <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                              Row Maximum Value
                            </p>
                            <p className="mt-1 text-base font-extrabold text-[#60a5fa]">
                              ৳{formatMoney(rowMaxValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div
                className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4"
                style={{ boxShadow: cardShadow }}
              >
                <p className="text-sm font-semibold text-white">Package Resource Value</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div
                    className="rounded-md border border-white/10 bg-[#101a31] px-4 py-3"
                    style={{ boxShadow: cardShadow }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      Minimum Value
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#facc15]">
                      ৳{formatMoney(packageValueSummary.minTotal)}
                    </p>
                  </div>

                  <div
                    className="rounded-md border border-white/10 bg-[#101a31] px-4 py-3"
                    style={{ boxShadow: cardShadow }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                      Maximum Value
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#60a5fa]">
                      ৳{formatMoney(packageValueSummary.maxTotal)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3b82f6] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ boxShadow: btnShadow }}
                >
                  {editingId ? (
                    <HiOutlinePencil className="text-base" />
                  ) : (
                    <HiOutlinePlus className="text-base" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Package"
                    : "Create Package"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-[#101a31] text-sm font-semibold text-white"
                    style={{ boxShadow: cardShadow }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        <section
          className="mt-5 rounded-[10px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-4">
            <p className="text-xs font-medium text-white/45">Created package list</p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
              Package <span className="text-[#60a5fa]">Preview</span>
            </h2>
          </div>

          {loading ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/50"
              style={{ boxShadow: cardShadow }}
            >
              Loading package history...
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPackages.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 sm:p-4"
                  style={{ boxShadow: cardShadow }}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#1b2748] px-3 py-1 text-[12px] font-semibold text-white">
                        #{index + 1}
                      </span>
                      <span className="rounded-full bg-[#13203e] px-3 py-1 text-[12px] font-semibold text-[#60a5fa]">
                        {item.packageName}
                      </span>
                      <span className="rounded-full bg-[#2a2110] px-3 py-1 text-[12px] font-semibold text-[#facc15]">
                        ৳{item.price}
                      </span>
                      <span className="rounded-full bg-[#1c253e] px-3 py-1 text-[12px] font-semibold text-white/80">
                        {item.validityHours} Hours
                      </span>
                      <span className="rounded-full bg-[#17301f] px-3 py-1 text-[12px] font-semibold text-[#4ade80]">
                        Min Value ৳{formatMoney(item.minResourceValue || 0)}
                      </span>
                      <span className="rounded-full bg-[#1a2644] px-3 py-1 text-[12px] font-semibold text-[#7dd3fc]">
                        Max Value ৳{formatMoney(item.maxResourceValue || 0)}
                      </span>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="grid h-10 w-10 place-items-center rounded-md bg-[#3b82f6] text-white"
                        style={{ boxShadow: btnShadow }}
                      >
                        <HiOutlinePencil className="text-base" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="grid h-10 w-10 place-items-center rounded-md bg-[#dc2626] text-white"
                        style={{
                          boxShadow:
                            "0 16px 30px rgba(220,38,38,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
                        }}
                      >
                        <HiOutlineTrash className="text-base" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {item.packageResources.map((resource) => {
                      const resourceInfo = priceMap.get(resource.fileName)
                      const unitPrice = Number(resourceInfo?.price || 0)

                      return (
                        <div
                          key={`${item.id}-${resource.rowId}`}
                          className="rounded-[10px] border border-white/10 bg-[#101a31] p-2.5"
                          style={{ boxShadow: cardShadow }}
                        >
                          <div className="relative mb-2 flex h-[68px] items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-[#0f1730] p-2">
                            <img
                              src={resource.image}
                              alt={resource.resourceName}
                              className="h-full w-full object-contain"
                            />

                            <span
                              className="absolute left-1 top-1 rounded-full bg-[#22c55e] px-1.5 py-[2px] text-[9px] font-bold text-white"
                              style={{
                                boxShadow:
                                  "0 10px 18px rgba(34,197,94,.22), inset 1px 1px 0 rgba(255,255,255,.14), inset -1px -1px 0 rgba(0,0,0,.12)",
                              }}
                            >
                              ৳{formatMoney(unitPrice)}
                            </span>
                          </div>

                          <p className="text-[11px] text-white/45">{resource.resourceName}</p>
                          <p className="mt-1 text-[12px] font-semibold text-white">
                            Min: {resource.minQty}
                          </p>
                          <p className="mt-0.5 text-[12px] font-semibold text-[#60a5fa]">
                            Max: {resource.maxQty}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {!sortedPackages.length && (
                <div
                  className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/50"
                  style={{ boxShadow: cardShadow }}
                >
                  No package created yet
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </main>
  )
}

function DeleteConfirmModal({ item, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-3">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-[340px] rounded-[10px] border border-white/10 bg-[#0a1428] p-4"
        style={{ boxShadow: "0 30px 120px rgba(0,0,0,.72)" }}
      >
        <p className="text-[11px] uppercase tracking-[0.12em] text-white/45">
          Delete Package
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">
          Are you sure you want to delete{" "}
          <span className="text-[#60a5fa]">{item.packageName}</span>?
        </h3>
        <p className="mt-2 text-sm text-white/50">
          This package will be removed from the database.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-white/10 bg-[#101a31] text-sm font-semibold text-white"
            style={{
              boxShadow:
                "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-md bg-[#dc2626] text-sm font-semibold text-white"
            style={{
              boxShadow:
                "0 16px 30px rgba(220,38,38,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)",
            }}
          >
            Confirm
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