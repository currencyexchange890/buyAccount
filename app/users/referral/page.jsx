"use client"

import { useState } from "react"
import { HiOutlineClipboardCopy, HiOutlineTag } from "react-icons/hi"

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)

  const referralCode = "PANDA2026"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error("Copy failed:", error)
    }
  }

  return (
    <main className="h-[100svh] overflow-hidden bg-[#081120] text-white flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            REFERRAL CODE
          </div>
        </div>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-6 sm:p-7"
          style={{ boxShadow: formShadow }}
        >
          <div className="text-center">
            <div
              className="mx-auto grid h-14 w-14 place-items-center rounded-md border border-white/10 bg-[#0f1a33] text-[#60a5fa]"
              style={{ boxShadow: fieldShadow }}
            >
              <HiOutlineTag className="text-2xl" />
            </div>

            <p className="mt-4 text-xs font-medium text-white/45">Share your code with friends</p>
            <h1 className="mt-1 text-3xl font-semibold">
              My <span className="text-[#60a5fa]">Referral</span>
            </h1>
          </div>

          <div
            className="mt-6 rounded-[10px] border border-white/10 bg-[#0f1a33] p-4 sm:p-5 text-center"
            style={{ boxShadow: fieldShadow }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
              Your code
            </p>

            <div
              className="mt-3 rounded-md border border-white/10 bg-[#101d38] px-4 py-4"
              style={{ boxShadow: fieldShadow }}
            >
              <span className="block text-xl font-semibold tracking-[0.22em] text-white">
                {referralCode}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#3b82f6] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px]"
              style={{ boxShadow: btnShadow }}
            >
              <HiOutlineClipboardCopy className="text-base" />
              {copied ? "Copied" : "Copy Code"}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}