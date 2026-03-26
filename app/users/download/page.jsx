"use client"

import Image from "next/image"
import { useState } from "react"
import { HiOutlineDownload, HiOutlineCheckCircle } from "react-icons/hi"

const apps = [
  {
    id: "account",
    title: "Account",
    logo: "/account.webp",
    file: "/Account.apk",
  },
  {
    id: "panda",
    title: "Panda",
    logo: "/panda.png",
    file: "/Panda.apk",
  },
]

const fieldShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const formShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

export default function DownloadPage() {
  const [progress, setProgress] = useState({
    account: 0,
    panda: 0,
  })

  const [downloading, setDownloading] = useState({
    account: false,
    panda: false,
  })

  const [completed, setCompleted] = useState({
    account: false,
    panda: false,
  })

  const handleDownload = (app) => {
    if (downloading[app.id]) return

    setProgress((prev) => ({ ...prev, [app.id]: 0 }))
    setCompleted((prev) => ({ ...prev, [app.id]: false }))
    setDownloading((prev) => ({ ...prev, [app.id]: true }))

    const link = document.createElement("a")
    link.href = app.file
    link.download = app.file.split("/").pop()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    let value = 0

    const timer = setInterval(() => {
      value += Math.floor(Math.random() * 16) + 8

      if (value >= 100) {
        value = 100
        clearInterval(timer)

        setProgress((prev) => ({ ...prev, [app.id]: 100 }))
        setDownloading((prev) => ({ ...prev, [app.id]: false }))
        setCompleted((prev) => ({ ...prev, [app.id]: true }))
        return
      }

      setProgress((prev) => ({ ...prev, [app.id]: value }))
    }, 180)
  }

  return (
    <main className="min-h-screen bg-[#081120] text-white flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-md">
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
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-5 sm:p-6"
          style={{ boxShadow: formShadow }}
        >
          <div className="mb-6">
            <p className="text-xs font-medium text-white/45">Get your apps instantly</p>
            <h1 className="mt-1 text-3xl font-semibold">
              Download <span className="text-[#60a5fa]">Apps</span>
            </h1>
          </div>

          <div className="space-y-4">
            {apps.map((app) => {
              const percent = progress[app.id]
              const isDownloading = downloading[app.id]
              const isCompleted = completed[app.id]

              return (
                <div
                  key={app.id}
                  className="rounded-md border border-white/10 bg-[#0f1a33] p-4"
                  style={{ boxShadow: fieldShadow }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#101d38]"
                      style={{ boxShadow: fieldShadow }}
                    >
                      <Image
                        src={app.logo}
                        alt={app.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-white">
                            {app.title}
                          </h2>
                          <p className="mt-0.5 text-xs text-white/55">
                            {app.file.replace("/", "")}
                          </p>
                        </div>

                        <div className="shrink-0 text-xs font-semibold tabular-nums text-white/80">
                          {percent}%
                        </div>
                      </div>

                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-[#101d38]">
                        <div
                          className="h-full rounded-full bg-[#3b82f6] transition-all duration-200"
                          style={{
                            width: `${percent}%`,
                            boxShadow:
                              percent > 0 ? "0 0 18px rgba(59,130,246,.45)" : "none",
                          }}
                        />
                      </div>

                      <div className="mt-2 text-xs text-white/65">
                        {isDownloading
                          ? "Downloading..."
                          : isCompleted
                          ? "Download complete"
                          : "Tap download icon to start"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(app)}
                      disabled={isDownloading}
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-md border transition active:translate-y-[1px] ${
                        isDownloading
                          ? "cursor-not-allowed border-white/10 bg-[#101d38] text-white/40"
                          : "border-white/10 bg-[#3b82f6] text-white hover:brightness-[1.03]"
                      }`}
                      style={{ boxShadow: isDownloading ? fieldShadow : btnShadow }}
                    >
                      {isCompleted && !isDownloading ? (
                        <HiOutlineCheckCircle className="text-[22px]" />
                      ) : (
                        <HiOutlineDownload className="text-[22px]" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}