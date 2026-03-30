"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlinePhotograph,
  HiOutlineCash,
} from "react-icons/hi"

const shellShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const cardShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

const dangerBtnShadow =
  "0 16px 30px rgba(220,38,38,.24), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.14)"

const initialForm = {
  id: "",
  name: "",
  price: "",
  imageUrl: "",
  cloudinaryPublicId: "",
  fileName: "",
}

export default function ResourcePricePage() {
  const router = useRouter()

  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [form, setForm] = useState(initialForm)

  const isEditing = Boolean(form.id)

  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  }, [resources])

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
        toast.error(data?.message || "Failed to load resources")
        return
      }

      setResources(Array.isArray(data?.resources) ? data.resources : [])
    } catch {
      toast.error("Failed to load resources")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResources()
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setUploading(false)
    setUploadProgress(0)
  }

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const uploadImageToCloudinary = async (file) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary env is missing")
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      const uploaded = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const data = new FormData()

        data.append("file", file)
        data.append("upload_preset", uploadPreset)

        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)

        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) return
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        })

        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return

          let payload = {}

          try {
            payload = JSON.parse(xhr.responseText || "{}")
          } catch {
            payload = {}
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(payload)
            return
          }

          reject(new Error(payload?.error?.message || "Image upload failed"))
        }

        xhr.onerror = () => reject(new Error("Image upload failed"))
        xhr.send(data)
      })

      setForm((prev) => ({
        ...prev,
        imageUrl: String(uploaded?.secure_url || "").trim(),
        cloudinaryPublicId: String(uploaded?.public_id || "").trim(),
        fileName: file.name,
      }))

      toast.success("Image uploaded successfully")
    } catch (error) {
      toast.error(error.message || "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file")
      event.target.value = ""
      return
    }

    await uploadImageToCloudinary(file)
    event.target.value = ""
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (uploading) {
      toast.error("Please wait for the upload to finish")
      return
    }

    if (!form.imageUrl) {
      toast.error("Please upload an image")
      return
    }

    if (!form.name.trim()) {
      toast.error("Please enter image name")
      return
    }

    if (form.price === "" || Number(form.price) < 0) {
      toast.error("Please enter a valid rate")
      return
    }

    try {
      setSaving(true)

      const res = await fetch("/api/admin/resource-price", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: form.id || undefined,
          name: form.name.trim(),
          price: Number(form.price),
          imageUrl: form.imageUrl,
          cloudinaryPublicId: form.cloudinaryPublicId,
          fileName: form.fileName,
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
        toast.error(data?.message || "Failed to save resource")
        return
      }

      setResources(Array.isArray(data?.resources) ? data.resources : [])
      toast.success(data?.message || (isEditing ? "Resource updated" : "Resource uploaded"))
      resetForm()
    } catch {
      toast.error("Failed to save resource")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      name: item.name || "",
      price: String(item.price ?? ""),
      imageUrl: item.image || item.imageUrl || "",
      cloudinaryPublicId: item.cloudinaryPublicId || "",
      fileName: item.fileName || "",
    })
    setUploading(false)
    setUploadProgress(100)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success(`${item.name} loaded for edit`)
  }

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete ${item.name}?`)

    if (!confirmed) return

    try {
      setDeletingId(item.id)

      const res = await fetch("/api/admin/resource-price", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id: item.id }),
      })

      if (res.status === 401) {
        toast.error("Admin access required")
        router.replace("/users/login")
        router.refresh()
        return
      }

      const data = await res.json()

      if (!res.ok) {
        toast.error(data?.message || "Failed to delete resource")
        return
      }

      setResources(Array.isArray(data?.resources) ? data.resources : [])

      if (form.id === item.id) {
        resetForm()
      }

      toast.success(data?.message || "Resource deleted successfully")
    } catch {
      toast.error("Failed to delete resource")
    } finally {
      setDeletingId("")
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

      <div className="mx-auto w-full max-w-[760px] px-3 pb-4 sm:px-4">
        <div className="mb-3 flex justify-start">
          <div
            className="rounded-full bg-[#3b82f6] px-3 py-1.5 text-[11px] font-semibold text-white sm:px-4 sm:text-xs"
            style={{
              boxShadow:
                "0 10px 24px rgba(59,130,246,.28), inset 1px 1px 0 rgba(255,255,255,.18), inset -1px -1px 0 rgba(0,0,0,.12)",
            }}
          >
            ADMIN PANEL
          </div>
        </div>

        <section
          className="rounded-[10px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-4">
            <p className="text-[11px] font-medium text-white/45 sm:text-xs">Manage resources</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">
              Resource <span className="text-[#60a5fa]">Manager</span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div
                className="min-w-0 rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 sm:p-4"
                style={{ boxShadow: cardShadow }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/80">
                      Resource Image
                    </label>
                    <label
                      className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-md border border-dashed border-white/15 bg-[#101a31] px-3 py-3 text-sm text-white/75"
                      style={{ boxShadow: cardShadow }}
                    >
                      <HiOutlinePhotograph className="shrink-0 text-lg text-[#60a5fa]" />
                      <span className="min-w-0 flex-1 break-words">
                        Choose image and upload to Cloudinary
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-[12px] text-white/55">
                      <span>Upload progress</span>
                      <span>{uploading ? `${uploadProgress}%` : form.imageUrl ? "100%" : "0%"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#3b82f6] transition-all"
                        style={{ width: `${uploading ? uploadProgress : form.imageUrl ? 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/80">
                      Image Name
                    </label>
                    <div
                      className="flex h-11 w-full items-center gap-3 rounded-md border border-white/10 bg-[#101a31] px-3"
                      style={{ boxShadow: cardShadow }}
                    >
                      <HiOutlinePencil className="shrink-0 text-[#60a5fa]" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => onFormChange("name", e.target.value)}
                        placeholder="Enter image name"
                        className="min-w-0 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/80">
                      Image Rate
                    </label>
                    <div
                      className="flex h-11 w-full items-center gap-3 rounded-md border border-white/10 bg-[#101a31] px-3"
                      style={{ boxShadow: cardShadow }}
                    >
                      <HiOutlineCash className="shrink-0 text-[#60a5fa]" />
                      <span className="shrink-0 text-sm font-semibold text-[#facc15]">৳</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => onFormChange("price", e.target.value)}
                        placeholder="Enter rate"
                        className="min-w-0 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={saving || uploading}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#3b82f6] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ boxShadow: btnShadow }}
                    >
                      {isEditing ? (
                        <HiOutlineRefresh className="text-base" />
                      ) : (
                        <HiOutlineUpload className="text-base" />
                      )}
                      {saving ? "Saving..." : isEditing ? "Update Resource" : "Upload Resource"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={saving || uploading}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-[#101a31] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ boxShadow: cardShadow }}
                    >
                      <HiOutlineX className="text-base" />
                      Clear Form
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="min-w-0 rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 sm:p-4"
                style={{ boxShadow: cardShadow }}
              >
                <p className="text-sm font-semibold text-white">Preview</p>

                <div
                  className="mt-3 flex min-h-[170px] items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-[#101a31] p-3"
                  style={{ boxShadow: cardShadow }}
                >
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt={form.name || "Resource preview"}
                      className="max-h-[140px] w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-sm text-white/45">
                      Upload an image to preview it here
                    </div>
                  )}
                </div>

                <div
                  className="mt-3 rounded-[10px] border border-white/10 bg-[#101a31] px-3 py-3"
                  style={{ boxShadow: cardShadow }}
                >
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                    Current Form Status
                  </p>
                  <p className="mt-2 truncate text-sm font-semibold text-white">
                    {form.name || "No name yet"}
                  </p>
                  <p className="mt-1 text-sm text-[#facc15]">
                    Rate: ৳{form.price === "" ? "0" : Number(form.price || 0)}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </section>

        <section
          className="mt-5 rounded-[10px] border border-white/10 bg-[#0a1428] p-3 sm:p-4"
          style={{ boxShadow: shellShadow }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white/45 sm:text-xs">Uploaded resources</p>
              <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                Resource <span className="text-[#60a5fa]">List</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={loadResources}
              className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-white/10 bg-[#101a31] px-3 text-sm font-semibold text-white"
              style={{ boxShadow: cardShadow }}
            >
              <HiOutlineRefresh className="text-base" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              Loading resources...
            </div>
          ) : !sortedResources.length ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/60"
              style={{ boxShadow: cardShadow }}
            >
              No resource uploaded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedResources.map((item) => {
                const isDeleting = deletingId === item.id

                return (
                  <div
                    key={item.id}
                    className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-3"
                    style={{ boxShadow: cardShadow }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div
                        className="flex h-[96px] w-full items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-[#101a31] p-2 sm:h-[110px] sm:w-[110px] sm:shrink-0"
                        style={{ boxShadow: cardShadow }}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-white/45">Resource Name</p>
                        <h3 className="mt-1 truncate text-base font-semibold text-white">
                          {item.name}
                        </h3>

                        <div
                          className="mt-3 rounded-md border border-white/10 bg-[#101a31] px-3 py-2"
                          style={{ boxShadow: cardShadow }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                            Rate
                          </p>
                          <p className="mt-1 text-base font-extrabold text-[#facc15]">
                            ৳{Number(item.price || 0).toLocaleString("en-BD", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            disabled={isDeleting}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-[#101a31] text-sm font-semibold text-white transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ boxShadow: cardShadow }}
                          >
                            <HiOutlinePencil className="text-base" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dc2626] text-sm font-semibold text-white transition hover:brightness-[1.03] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ boxShadow: dangerBtnShadow }}
                          >
                            <HiOutlineTrash className="text-base" />
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
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