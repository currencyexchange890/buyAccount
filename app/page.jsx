"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import toast, { Toaster } from "react-hot-toast"

const shellShadow =
  "16px 16px 34px rgba(0,0,0,.38), -8px -8px 20px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.04), inset -1px -1px 0 rgba(0,0,0,.26)"

const cardShadow =
  "8px 8px 20px rgba(0,0,0,.28), -3px -3px 10px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.04), inset -1px -1px 0 rgba(0,0,0,.2)"

const blueBtnShadow =
  "10px 12px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.12), inset -1px -1px 0 rgba(0,0,0,.16)"

export default function StorePage() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadResources() {
      try {
        setLoading(true)

        const res = await fetch("/api/resource-price", {
          method: "GET",
          cache: "no-store",
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message || "Failed to load resources")
        }

        if (!ignore) {
          setResources(Array.isArray(data?.resources) ? data.resources : [])
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load resources")
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadResources()

    return () => {
      ignore = true
    }
  }, [])

  const openModal = (item) => {
    setSelectedItem(item)
  }

  const closeModal = () => {
    setSelectedItem(null)
  }

  const handleSell = () => {
    if (!selectedItem) {
      toast.error("No item selected")
      return
    }

    toast.success(`${selectedItem.name} selected successfully`)
    closeModal()
  }

  return (
    <main className="min-h-screen bg-[#081120] px-3 py-4 text-white sm:px-4 sm:py-5">
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

      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full border border-white/10 bg-gradient-to-b from-[#4f8dfd] to-[#2f6fe8] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white"
            style={{
              boxShadow:
                "0 10px 22px rgba(59,130,246,.24), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.14)",
            }}
          >
            STORE
          </div>
        </div>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-4">
            <p className="text-[11px] font-medium text-white/45">Your store collection</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-none sm:text-[34px]">
              My <span className="text-[#60a5fa]">Store</span>
            </h1>
          </div>

          {loading ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              Loading store resources...
            </div>
          ) : resources.length === 0 ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-4 text-sm text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              No resources found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {resources.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-2.5"
                  style={{ boxShadow: cardShadow }}
                >
                  <div
                    className="relative aspect-square overflow-hidden rounded-[10px] border border-white/10 bg-[#101d38]"
                    style={{ boxShadow: cardShadow }}
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 240px"
                      className="object-contain"
                    />
                  </div>

                  <div className="mt-2">
                    <p className="truncate text-[12px] font-semibold text-white sm:text-[13px]">
                      {item.name}
                    </p>
                  </div>

                  <div
                    className="mt-2 rounded-[10px] border border-white/10 bg-[#101a31] px-2 py-1.5"
                    style={{ boxShadow: cardShadow }}
                  >
                    <p className="text-[8px] font-medium uppercase leading-tight tracking-[0.04em] text-white/42 sm:text-[9px]">
                      Price
                    </p>
                    <p className="mt-0.5 text-[11px] font-extrabold leading-tight text-[#facc15] sm:text-[12px]">
                      ৳{formatMoney(item.price)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openModal(item)}
                    className="mt-2 h-9 w-full rounded-[10px] border border-white/10 bg-gradient-to-b from-[#3c84ff] to-[#2b6de5] text-[12px] font-semibold tracking-[0.03em] text-white transition hover:brightness-105 active:translate-y-[1px] sm:text-[13px]"
                    style={{ boxShadow: blueBtnShadow }}
                  >
                    Sell
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedItem && (
        <SellModal item={selectedItem} onClose={closeModal} onSell={handleSell} />
      )}
    </main>
  )
}

function SellModal({ item, onClose, onSell }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-3">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-[320px] rounded-[10px] border border-white/10 bg-[#0a1428] p-3"
        style={{ boxShadow: "0 30px 120px rgba(0,0,0,.72)" }}
      >
        <div
          className="relative aspect-square overflow-hidden rounded-[10px] border border-white/10 bg-[#101d38] p-2"
          style={{ boxShadow: cardShadow }}
        >
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 70vw, 280px"
            className="object-contain p-2"
          />
        </div>

        <div className="mt-3 rounded-md border border-white/10 bg-[#0f1a33] p-3" style={{ boxShadow: cardShadow }}>
          <p className="truncate text-center text-sm font-semibold text-white">
            {item.name}
          </p>
          <p className="mt-1 text-center text-lg font-extrabold text-[#facc15]">
            ৳{formatMoney(item.price)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-white/10 bg-[#101d38] text-[12px] font-semibold text-white/85 transition hover:text-white sm:text-sm"
            style={{ boxShadow: cardShadow }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSell}
            className="h-9 rounded-md border border-white/10 bg-gradient-to-b from-[#3c84ff] to-[#2b6de5] text-[12px] font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] sm:text-sm"
            style={{ boxShadow: blueBtnShadow }}
          >
            Sell Now
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