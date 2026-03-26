"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"
import {
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineCash,
  HiOutlineCreditCard,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineSearch,
  HiOutlineFilter,
} from "react-icons/hi"

const shellShadow =
  "18px 18px 38px rgba(0,0,0,.42), -10px -10px 24px rgba(255,255,255,.03), inset 1px 1px 0 rgba(255,255,255,.06), inset -1px -1px 0 rgba(0,0,0,.28)"

const cardShadow =
  "8px 8px 18px rgba(0,0,0,.32), -4px -4px 10px rgba(255,255,255,.025), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)"

const btnShadow =
  "10px 10px 24px rgba(18,40,88,.42), -4px -4px 10px rgba(255,255,255,.08), inset 1px 1px 0 rgba(255,255,255,.22), inset -2px -2px 0 rgba(0,0,0,.12)"

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD")
}

function formatDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function UserManagementPage() {
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("latest")

  const [selectedUser, setSelectedUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editedBalance, setEditedBalance] = useState("")
  const [editedStatus, setEditedStatus] = useState("inactive")
  const [showStatusOptions, setShowStatusOptions] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true)

        const res = await fetch("/api/admin/user-management", {
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
          toast.error(data?.message || "Failed to load users")
          return
        }

        setUsers(data?.users || [])
      } catch {
        toast.error("Failed to load users")
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [router])

  const stats = useMemo(() => {
    const totalUsers = users.length
    const totalActiveUsers = users.filter((item) => item.status === "active").length
    const totalInactiveUsers = users.filter((item) => item.status === "inactive").length
    const totalBalance = users.reduce((sum, item) => sum + Number(item.balance || 0), 0)
    const totalWithdraw = users.reduce((sum, item) => sum + Number(item.totalWithdraw || 0), 0)
    const totalDeposit = users.reduce((sum, item) => sum + Number(item.totalDeposit || 0), 0)
    const totalStockBalance = totalDeposit - totalWithdraw

    return {
      totalUsers,
      totalActiveUsers,
      totalInactiveUsers,
      totalBalance,
      totalWithdraw,
      totalDeposit,
      totalStockBalance,
    }
  }, [users])

  const filteredUsers = useMemo(() => {
    let list = [...users]

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.mobile.toLowerCase().includes(q)
      )
    }

    if (roleFilter !== "all") {
      list = list.filter((item) => item.role === roleFilter)
    }

    if (statusFilter !== "all") {
      list = list.filter((item) => item.status === statusFilter)
    }

    if (sortBy === "latest") {
      list.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    }

    if (sortBy === "high-balance") {
      list.sort((a, b) => Number(b.balance) - Number(a.balance))
    }

    if (sortBy === "low-balance") {
      list.sort((a, b) => Number(a.balance) - Number(b.balance))
    }

    return list
  }, [users, searchTerm, roleFilter, statusFilter, sortBy])

  const openModal = (user) => {
    setSelectedUser(user)
    setEditedBalance(String(user.balance))
    setEditedStatus(user.status)
    setEditing(false)
    setShowStatusOptions(false)
  }

  const closeModal = () => {
    setSelectedUser(null)
    setEditedBalance("")
    setEditedStatus("inactive")
    setEditing(false)
    setShowStatusOptions(false)
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return

    const nextBalance = Number(editedBalance)

    if (Number.isNaN(nextBalance) || nextBalance < 0) {
      toast.error("Balance must be a valid number")
      return
    }

    if (!["active", "inactive"].includes(editedStatus)) {
      toast.error("Select a valid status")
      return
    }

    try {
      setSaving(true)

      const res = await fetch("/api/admin/user-management", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedUser.id,
          balance: nextBalance,
          status: editedStatus,
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
        toast.error(data?.message || "Failed to update user")
        return
      }

      setUsers((prev) =>
        prev.map((item) => (item.id === data.user.id ? data.user : item))
      )

      setSelectedUser(data.user)
      setEditedBalance(String(data.user.balance))
      setEditedStatus(data.user.status)
      setEditing(false)
      setShowStatusOptions(false)

      toast.success(data?.message || "User updated successfully")
    } catch {
      toast.error("Failed to update user")
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
            <p className="text-xs font-medium text-white/45">Manage all users and balances</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              User <span className="text-[#60a5fa]">Management</span>
            </h1>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-7">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Active Users" value={stats.totalActiveUsers} highlight="green" />
            <StatCard label="Inactive Users" value={stats.totalInactiveUsers} highlight="red" />
            <StatCard label="Total Balance" value={`৳${formatMoney(stats.totalBalance)}`} highlight="blue" />
            <StatCard label="Total Withdraw" value={`৳${formatMoney(stats.totalWithdraw)}`} highlight="red" />
            <StatCard label="Total Deposit" value={`৳${formatMoney(stats.totalDeposit)}`} highlight="yellow" />
            <StatCard
              label="Total Stock Balance"
              value={`৳${formatMoney(stats.totalStockBalance)}`}
              highlight="green"
            />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div
              className="flex h-12 items-center gap-3 rounded-md border border-white/10 bg-[#0f1a33] px-4 lg:col-span-2"
              style={{ boxShadow: cardShadow }}
            >
              <HiOutlineSearch className="shrink-0 text-[#60a5fa]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or mobile"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
              />
            </div>

            <div
              className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4"
              style={{ boxShadow: cardShadow }}
            >
              <HiOutlineFilter className="shrink-0 text-[#60a5fa]" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
              >
                <option value="all" className="bg-[#0f1a33]">All Roles</option>
                <option value="user" className="bg-[#0f1a33]">User</option>
                <option value="admin" className="bg-[#0f1a33]">Admin</option>
              </select>
            </div>

            <div
              className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4"
              style={{ boxShadow: cardShadow }}
            >
              <HiOutlineFilter className="shrink-0 text-[#60a5fa]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
              >
                <option value="all" className="bg-[#0f1a33]">All Status</option>
                <option value="active" className="bg-[#0f1a33]">Active</option>
                <option value="inactive" className="bg-[#0f1a33]">Inactive</option>
              </select>
            </div>

            <div
              className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-[#0f1a33] px-4 lg:col-span-1"
              style={{ boxShadow: cardShadow }}
            >
              <HiOutlineFilter className="shrink-0 text-[#60a5fa]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
              >
                <option value="latest" className="bg-[#0f1a33]">Latest First</option>
                <option value="high-balance" className="bg-[#0f1a33]">High Balance</option>
                <option value="low-balance" className="bg-[#0f1a33]">Low Balance</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div
              className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/50"
              style={{ boxShadow: cardShadow }}
            >
              Loading users...
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openModal(user)}
                  className="w-full rounded-[10px] border border-white/10 bg-[#0f1a33] p-3 text-left transition hover:brightness-[1.03]"
                  style={{ boxShadow: cardShadow }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-[#101a31] text-[#60a5fa]"
                      style={{ boxShadow: cardShadow }}
                    >
                      <HiOutlineUser className="text-[18px]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{user.name}</p>

                        <span
                          className={`rounded-full px-2 py-[3px] text-[10px] font-semibold ${
                            user.status === "active"
                              ? "bg-[#12331f] text-[#4ade80]"
                              : "bg-[#2a1a1a] text-[#f87171]"
                          }`}
                        >
                          {user.status}
                        </span>

                        <span className="rounded-full bg-[#1b2748] px-2 py-[3px] text-[10px] font-semibold text-[#7dd3fc]">
                          {user.role}
                        </span>
                      </div>

                      <p className="mt-1 text-[12px] text-white/50">{user.mobile}</p>
                      <p className="mt-1 text-[11px] text-white/35">
                        Joined {formatDate(user.joinDate)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        #{index + 1}
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-[#facc15]">
                        ৳{formatMoney(user.balance)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {!filteredUsers.length && (
                <div
                  className="rounded-[10px] border border-white/10 bg-[#0f1a33] p-5 text-center text-white/50"
                  style={{ boxShadow: cardShadow }}
                >
                  No users found
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          editedBalance={editedBalance}
          setEditedBalance={setEditedBalance}
          editedStatus={editedStatus}
          setEditedStatus={setEditedStatus}
          editing={editing}
          setEditing={setEditing}
          showStatusOptions={showStatusOptions}
          setShowStatusOptions={setShowStatusOptions}
          saving={saving}
          onClose={closeModal}
          onSave={handleSaveUser}
        />
      )}
    </main>
  )
}

function StatCard({ label, value, highlight = "white" }) {
  const colorMap = {
    white: "text-white",
    blue: "text-[#60a5fa]",
    yellow: "text-[#facc15]",
    red: "text-[#f87171]",
    green: "text-[#4ade80]",
  }

  return (
    <div
      className="rounded-[10px] border border-white/10 bg-[#0f1a33] px-3 py-3"
      style={{ boxShadow: cardShadow }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">
        {label}
      </p>
      <p className={`mt-2 text-lg font-extrabold leading-none ${colorMap[highlight]}`}>
        {value}
      </p>
    </div>
  )
}

function UserDetailsModal({
  user,
  editedBalance,
  setEditedBalance,
  editedStatus,
  setEditedStatus,
  editing,
  setEditing,
  showStatusOptions,
  setShowStatusOptions,
  saving,
  onClose,
  onSave,
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-3">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-[380px] rounded-[10px] border border-white/10 bg-[#0a1428] p-4"
        style={{ boxShadow: "0 30px 120px rgba(0,0,0,.72)" }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
              User Overview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">{user.name}</h2>
            <p className="mt-1 text-[12px] text-white/45">{user.mobile}</p>
          </div>

          <button
            type="button"
            onClick={editing ? onSave : () => setEditing(true)}
            disabled={saving}
            className="flex h-9 items-center gap-2 rounded-md bg-[#3b82f6] px-3 text-[12px] font-semibold text-white disabled:opacity-60"
            style={{ boxShadow: btnShadow }}
          >
            {editing ? <HiOutlineCheck className="text-sm" /> : <HiOutlinePencil className="text-sm" />}
            {saving ? "Saving..." : editing ? "Save" : "Edit"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2.5"
            style={{ boxShadow: cardShadow }}
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              Status
            </p>

            <button
              type="button"
              disabled={!editing}
              onClick={() => editing && setShowStatusOptions((prev) => !prev)}
              className={`mt-1 w-full rounded-md text-left font-semibold ${
                editedStatus === "active" ? "text-[#4ade80]" : "text-[#f87171]"
              } ${editing ? "cursor-pointer" : "cursor-default"}`}
            >
              {editedStatus}
            </button>

            {editing && showStatusOptions && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditedStatus("active")
                    setShowStatusOptions(false)
                  }}
                  className="rounded-md bg-[#12331f] px-2 py-1.5 text-[12px] font-semibold text-[#4ade80]"
                >
                  active
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditedStatus("inactive")
                    setShowStatusOptions(false)
                  }}
                  className="rounded-md bg-[#2a1a1a] px-2 py-1.5 text-[12px] font-semibold text-[#f87171]"
                >
                  inactive
                </button>
              </div>
            )}
          </div>

          <div
            className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2.5"
            style={{ boxShadow: cardShadow }}
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              Balance
            </p>

            {editing ? (
              <input
                type="number"
                min="0"
                value={editedBalance}
                onChange={(e) => setEditedBalance(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-bold text-[#facc15] outline-none"
              />
            ) : (
              <p className="mt-1 text-sm font-extrabold text-[#facc15]">
                ৳{formatMoney(user.balance)}
              </p>
            )}
          </div>

          <MiniBox label="Total Deposit" value={`৳${formatMoney(user.totalDeposit)}`} />
          <MiniBox label="Total Withdraw" value={`৳${formatMoney(user.totalWithdraw)}`} />
          <MiniBox label="Role" value={user.role} />
          <MiniBox label="Join Date" value={formatDate(user.joinDate)} />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-md border border-white/10 bg-[#101a31] text-sm font-semibold text-white/85"
            style={{ boxShadow: cardShadow }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniBox({ label, value }) {
  return (
    <div
      className="rounded-md border border-white/10 bg-[#101a31] px-3 py-2.5"
      style={{ boxShadow: cardShadow }}
    >
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}