"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import { HiOutlineCash, HiOutlineRefresh, HiOutlinePencil } from "react-icons/hi"

const shellShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const cardShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function ResourcePricePage() {
  const router = useRouter()

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [editingIds, setEditingIds] = useState([])

  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/resource-price", {
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
          toast.error(data?.message || "Failed to load resource prices")
          return
        }

        setResources(data?.resources || [])
      } catch {
        toast.error("Failed to load resource prices")
      } finally {
        setLoading(false)
      }
    }

    loadResources()
  }, [router])

  const handlePriceChange = (id, value) => {
    setResources((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: value } : item
      )
    )
  }

  const enableEdit = (id) => {
    setEditingIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const handleUpdate = async (item) => {
    try {
      setSavingId(item.id)

      const res = await fetch("/api/admin/resource-price", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileName: item.fileName,
          price: item.price,
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
        toast.error(data?.message || "Failed to update resource price")
        return
      }

      setResources((prev) =>
        prev.map((resource) =>
          resource.id === item.id
            ? { ...resource, price: data.resource.price }
            : resource
        )
      )

      setEditingIds((prev) => prev.filter((editId) => editId !== item.id))
      toast.success(data?.message || "Resource price updated successfully")
    } catch {
      toast.error("Failed to update resource price")
    } finally {
      setSavingId(null)
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
          className="rounded-[28px] border border-white/10 bg-[#0a1428] p-4 sm:p-5"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-5">
            <p className="text-xs font-medium text-white/45">
              Manage resource prices
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Resource <span className="text-[#60a5fa]">Price</span>
            </h1>
          </div>

          {loading ? (
            <div
              className="rounded-[24px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              Loading resource prices...
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((item) => {
                const isEditing = editingIds.includes(item.id)
                const isSaving = savingId === item.id

                return (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-white/10 bg-[#0f1a33] p-3 sm:p-4"
                    style={{ boxShadow: cardShadow }}
                  >
                    <div className="flex items-stretch gap-3">
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                            {item.name}
                          </div>

                          <div
                            className="flex h-11 items-center gap-3 rounded-2xl border border-white/10 bg-[#101a31] px-3"
                            style={{ boxShadow: cardShadow }}
                          >
                            <HiOutlineCash className="shrink-0 text-[#60a5fa]" />
                            <span className="text-sm font-semibold text-[#facc15]">
                              ৳
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) =>
                                handlePriceChange(item.id, e.target.value)
                              }
                              disabled={!isEditing || isSaving}
                              className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:text-white/55"
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => enableEdit(item.id)}
                            disabled={isSaving}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#101a31] text-sm font-semibold text-white transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ boxShadow: cardShadow }}
                          >
                            <HiOutlinePencil className="text-base" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdate(item)}
                            disabled={!isEditing || isSaving}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ boxShadow: btnShadow }}
                          >
                            <HiOutlineRefresh className="text-base" />
                            {isSaving ? "Updating..." : "Update"}
                          </button>
                        </div>
                      </div>

                      <div
                        className="flex h-[108px] w-[108px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[#101a31] p-2 sm:h-[120px] sm:w-[120px]"
                        style={{ boxShadow: cardShadow }}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}