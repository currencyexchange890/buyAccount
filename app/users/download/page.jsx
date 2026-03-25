"use client"

import { useState } from "react"
import {
  HiOutlineDownload,
  HiOutlineDeviceMobile,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
} from "react-icons/hi"

const apps = [
  { id: "buy", title: "Buy Account" },
  { id: "taptap", title: "Tap Tap Panda" },
]

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function DownloadPage() {
  const [active, setActive] = useState(null)

  const activeApp = apps.find((app) => app.id === active)

  return (
    <main className="min-h-screen bg-[#081120] text-white flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-semibold text-white"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            DOWNLOAD APPS
          </div>
        </div>

        <div
          className="rounded-[28px] border border-white/10 bg-[#0a1428] p-6 sm:p-7"
          style={{ boxShadow: formShadow }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/45">Get your app instantly</p>
              <h1 className="mt-1 text-3xl font-semibold">
                Download <span className="text-[#60a5fa]">Apps</span>
              </h1>
            </div>

            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1a33] text-[#60a5fa]"
              style={{ boxShadow: fieldShadow }}
            >
              <HiOutlineShieldCheck className="text-xl" />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {apps.map((app) => (
              <DownloadCard
                key={app.id}
                title={app.title}
                active={active === app.id}
                onClick={() => setActive(app.id)}
              />
            ))}

            <div
              className="rounded-2xl border border-white/10 bg-[#0f1a33] p-4"
              style={{ boxShadow: fieldShadow }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <HiOutlineDeviceMobile className="shrink-0 text-lg text-[#60a5fa]" />
                  <div className="truncate text-sm font-semibold text-white/85">
                    {activeApp ? activeApp.title : "Select an app"}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-white/55">
                  {activeApp ? "Ready" : "Idle"}
                </div>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-[#101d38]">
                <div
                  className="h-full rounded-full bg-[#3b82f6] transition-all duration-300"
                  style={{
                    width: activeApp ? "100%" : "0%",
                    boxShadow: activeApp ? "0 0 18px rgba(59,130,246,.45)" : "none",
                  }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-white/55">1 MB</div>
                <div className="font-semibold tabular-nums text-white/80">
                  {activeApp ? "100%" : "0%"}
                </div>
              </div>

              {activeApp && (
                <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                  <HiOutlineCheckCircle className="text-lg text-[#60a5fa]" />
                  Ready to download
                </div>
              )}

              <button
                type="button"
                disabled={!activeApp}
                className={`mt-4 h-12 w-full rounded-2xl font-semibold text-white transition active:translate-y-[1px] ${
                  activeApp
                    ? "bg-[#3b82f6] hover:brightness-[1.03]"
                    : "bg-[#101d38] text-white/45 cursor-not-allowed"
                }`}
                style={{ boxShadow: activeApp ? btnShadow : fieldShadow }}
              >
                {activeApp ? `Download ${activeApp.title}` : "Choose an app first"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function DownloadCard({ title, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 transition ${
        active
          ? "border-[#60a5fa]/30 bg-[#3b82f6] text-white"
          : "border-white/10 bg-[#0f1a33] text-white/90 hover:text-white"
      }`}
      style={{ boxShadow: active ? btnShadow : fieldShadow }}
    >
      <div className="min-w-0 text-left">
        <div className="truncate text-sm font-semibold">{title}</div>
      </div>

      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
          active
            ? "border-white/15 bg-white/10 text-white"
            : "border-white/10 bg-[#101d38] text-[#60a5fa]"
        }`}
        style={{ boxShadow: fieldShadow }}
      >
        <HiOutlineDownload className="text-xl" />
      </div>
    </button>
  )
}