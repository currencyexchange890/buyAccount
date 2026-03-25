"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaAccusoft } from "react-icons/fa";
import {
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineHome,
  HiOutlineDownload,
  HiOutlineCash,
  HiOutlineCreditCard,
  HiOutlineReceiptTax,
  HiOutlineTag,
  HiOutlineCollection,
  HiOutlineLogout,
  HiOutlineCog,
  HiOutlineCheckCircle,
  HiOutlinePhotograph,
  HiOutlineSupport,
  HiOutlineUser,
} from "react-icons/hi";

const USER_NAV_ITEMS = [
  { href: "/users/dashboard", label: "Dashboard", Icon: HiOutlineHome },
  { href: "/users/deposit", label: "Deposit", Icon: HiOutlineCash },
  { href: "/users/withdraw", label: "Withdraw", Icon: HiOutlineCreditCard },
  { href: "/download", label: "Download", Icon: HiOutlineDownload },
  { href: "/users/store", label: "Store", Icon: HiOutlineHome },
  {
    href: "/users/transactions",
    label: "Transactions",
    Icon: HiOutlineReceiptTax,
  },
  { href: "/users/referral", label: "Referral", Icon: HiOutlineTag },
  { href: "/users/pricing", label: "Pricing", Icon: HiOutlineCollection },
  { href: "/users/accounts", label: "Accounts", Icon: FaAccusoft },
];

const ADMIN_NAV_ITEMS = [
  {
    href: "/admins/approve-deposit",
    label: "Approve Deposit",
    Icon: HiOutlineCheckCircle,
  },
  {
    href: "/admins/approve-withdraw",
    label: "Approve Withdraw",
    Icon: HiOutlineCreditCard,
  },
  {
    href: "/admins/resource-price",
    label: "Resource Price",
    Icon: HiOutlinePhotograph,
  },
  {
    href: "/admins/support-setup",
    label: "Support Setup",
    Icon: HiOutlineSupport,
  },
  {
    href: "/admins/settings-configuration",
    label: "Settings Config",
    Icon: HiOutlineCog,
  },
  {
    href: "/admins/user-management",
    label: "User Management",
    Icon: HiOutlineUser,
  },
  {
    href: "/admins/price-list",
    label: "Price List",
    Icon: HiOutlineCollection,
  },
  {
    href: "/admins/payment-method",
    label: "Admin Payment",
    Icon: HiOutlineCog,
  },
];

const PUBLIC_PATHS = ["/users/login", "/users/signup"];

const cardShadow =
  "0 24px 60px rgba(0,0,0,.38), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.28)";

const fieldShadow =
  "0 12px 24px rgba(0,0,0,.22), inset 1px 1px 0 rgba(255,255,255,.05), inset -1px -1px 0 rgba(0,0,0,.24)";

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isPublicPage(pathname) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("en-BD");
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [summary, setSummary] = useState(null);
  const [activeTip, setActiveTip] = useState("");
  const tooltipTimerRef = useRef(null);

  const hideShell = isPublicPage(pathname);

  const currentRole =
    summary?.role || (pathname.startsWith("/admins") ? "admin" : "user");

  const navItems = currentRole === "admin" ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (open && !hideShell) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = "";
      body.style.overflow = "";
    }

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, [open, hideShell]);

  useEffect(() => {
    if (hideShell) return;

    const loadSummary = async () => {
      try {
        const res = await fetch("/api/me/summary", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        setSummary(data);
      } catch {}
    };

    loadSummary();
  }, [hideShell, pathname]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  const currentPage = useMemo(() => {
    const item = navItems.find((nav) => isActive(pathname, nav.href));
    return (
      item?.label || (currentRole === "admin" ? "Admin Panel" : "Dashboard")
    );
  }, [pathname, navItems, currentRole]);

  const showTooltipFor = (type) => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
    }

    setActiveTip(type);

    tooltipTimerRef.current = setTimeout(() => {
      setActiveTip("");
    }, 3000);
  };

  const handleSignOut = async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);

      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setOpen(false);
      router.replace("/users/login");
      router.refresh();
      setSigningOut(false);
    }
  };

  if (hideShell) {
    return (
      <div className="min-h-screen bg-[#07111f] text-white">
        <TooltipMotionStyles />
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-[-120px] top-[-120px] h-[260px] w-[260px] rounded-full bg-[#2563eb]/15 blur-3xl" />
          <div className="absolute bottom-[-140px] right-[-100px] h-[280px] w-[280px] rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <main className="relative min-h-screen">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <TooltipMotionStyles />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-[260px] w-[260px] rounded-full bg-[#2563eb]/15 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-100px] h-[280px] w-[280px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header
        className={`fixed inset-x-0 top-0 z-[80] border-b border-white/10 bg-[#081120]/95 backdrop-blur-xl transition-all duration-300 ${
          open
            ? "-translate-y-full pointer-events-none opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#7dd3fc] transition-all duration-300 active:scale-95 lg:hidden"
              style={{ boxShadow: fieldShadow }}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-sidebar"
            >
              <HiOutlineMenu className="text-[20px]" />
            </button>

            <div className="leading-tight">
              <h2 className="text-base font-semibold sm:text-lg">
                My{" "}
                <span className="bg-gradient-to-r from-[#60a5fa] to-cyan-300 bg-clip-text text-transparent">
                  {currentPage}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BalanceChip
              amount={summary?.depositBalance ?? 0}
              color="yellow"
              open={activeTip === "deposit"}
              onClick={() => showTooltipFor("deposit")}
              tooltipText={`My Deposit Balance ৳${formatMoney(
                summary?.depositBalance ?? 0,
              )}`}
            />

            <BalanceChip
              amount={summary?.withdrawBalance ?? 0}
              color="blue"
              open={activeTip === "withdraw"}
              onClick={() => showTooltipFor("withdraw")}
              tooltipText={`My Withdraw Balance ৳${formatMoney(
                summary?.withdrawBalance ?? 0,
              )}`}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-7xl gap-5 px-4 pt-[84px] sm:px-6">
        <aside className="hidden w-[270px] shrink-0 lg:block">
          <div className="sticky top-[84px] h-[calc(100vh-96px)]">
            <Sidebar
              pathname={pathname}
              navItems={navItems}
              fullName={summary?.fullName || "Loading..."}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto pb-6 pr-1">
          {children}
        </main>
      </div>

      <div
        className={`fixed inset-0 z-[90] lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[#020817]/75 backdrop-blur-md transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="mobile-sidebar"
          className={`absolute left-0 top-0 h-full w-[80vw] border-r border-white/10 bg-[linear-gradient(180deg,#081120_0%,#0b1528_100%)] transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ boxShadow: "28px 0 70px rgba(0,0,0,.5)" }}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-4 py-3">
              <div
                className="relative rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,27,53,.96),rgba(10,20,40,.96))] px-3 py-4"
                style={{ boxShadow: cardShadow }}
              >
                <h3 className="mx-auto max-w-[calc(100%-56px)] text-center text-lg font-extrabold">
                  <span className="bg-gradient-to-r from-[#60a5fa] to-cyan-300 bg-clip-text text-transparent">
                    {summary?.fullName || "Loading..."}
                  </span>
                </h3>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#7dd3fc] transition-all duration-300 active:scale-95"
                  style={{ boxShadow: fieldShadow }}
                  aria-label="Close menu"
                >
                  <HiOutlineX className="text-[20px]" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
              <Sidebar
                pathname={pathname}
                navItems={navItems}
                onNavigate={() => setOpen(false)}
                mobile
                fullName={summary?.fullName || "Loading..."}
                onSignOut={handleSignOut}
                signingOut={signingOut}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TooltipMotionStyles() {
  return (
    <style jsx global>{`
      @keyframes balanceTipShine {
        0% {
          transform: translateX(-160%);
          opacity: 0;
        }
        15% {
          opacity: 0.15;
        }
        45% {
          opacity: 0.45;
        }
        100% {
          transform: translateX(260%);
          opacity: 0;
        }
      }
    `}</style>
  );
}

function BalanceChip({ amount, color, open, onClick, tooltipText }) {
  const chipClass =
    color === "yellow"
      ? "border-yellow-300/20 bg-[#facc15]/90 text-[#111827]"
      : "border-white/10 bg-[#3b82f6]/90 text-white";

  const tooltipClass =
    color === "yellow"
      ? "bg-[#facc15] text-[#111827]"
      : "bg-[#3b82f6] text-white";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`rounded-2xl border px-4 py-2 text-[13px] font-extrabold sm:text-sm ${chipClass}`}
        style={{
          boxShadow:
            "0 10px 24px rgba(0,0,0,.18), inset 1px 1px 0 rgba(255,255,255,.16), inset -1px -1px 0 rgba(0,0,0,.12)",
        }}
      >
        ৳{formatMoney(amount)}
      </button>

      <div
        className={`pointer-events-none absolute right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl px-3 py-2 text-[12px] font-semibold shadow-xl transition-all duration-200 ${
          open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        } ${tooltipClass}`}
      >
        <span className="relative z-10 whitespace-nowrap">{tooltipText}</span>

        {open && (
          <span
            className="absolute inset-y-0 left-[-35%] w-[34%] bg-gradient-to-r from-transparent via-white/55 to-transparent"
            style={{ animation: "balanceTipShine 1.2s linear infinite" }}
          />
        )}
      </div>
    </div>
  );
}

function Sidebar({
  pathname,
  navItems,
  onNavigate,
  mobile = false,
  fullName,
  onSignOut,
  signingOut,
}) {
  return (
    <div
      className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,43,.96),rgba(9,18,35,.96))] p-4"
      style={{ boxShadow: cardShadow }}
    >
      {!mobile && (
        <div className="mb-4 border-b border-white/10 pb-4 text-center">
          <h3 className="mx-auto text-center text-lg font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-[#60a5fa] to-cyan-300 bg-clip-text text-transparent">
              {fullName}
            </span>
          </h3>
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`group relative flex min-h-[50px] items-center gap-3 overflow-hidden rounded-2xl border px-4 text-sm font-medium transition-all duration-300 ${
                active
                  ? "border-[#60a5fa]/30 bg-[linear-gradient(135deg,#3b82f6,#2563eb)] text-white"
                  : "border-white/10 bg-white/[0.04] text-white/80 hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
              }`}
              style={{
                boxShadow: active
                  ? "0 18px 38px rgba(37,99,235,.28), inset 1px 1px 0 rgba(255,255,255,.14), inset -1px -1px 0 rgba(0,0,0,.12)"
                  : fieldShadow,
              }}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-300 ${
                  active
                    ? "bg-white/15 text-white"
                    : "bg-[#0e1a34] text-[#7dd3fc] group-hover:bg-[#132242]"
                }`}
              >
                <Icon className="text-lg" />
              </span>

              <span className="min-w-0 flex-1 text-[13px] leading-tight">
                {label}
              </span>

              {active && (
                <span className="absolute right-3 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="flex h-[50px] w-full items-center gap-3 rounded-2xl border border-red-400/20 bg-[linear-gradient(180deg,#ef4444,#dc2626)] px-4 text-sm font-semibold text-white transition-all duration-300 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            boxShadow:
              "0 18px 36px rgba(220,38,38,.28), inset 1px 1px 0 rgba(255,255,255,.12), inset -1px -1px 0 rgba(0,0,0,.16)",
          }}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
            <HiOutlineLogout className="text-lg" />
          </span>
          <span className="min-w-0 flex-1 text-left leading-tight">
            {signingOut ? "Signing Out..." : "Sign Out"}
          </span>
        </button>
      </div>
    </div>
  );
}
