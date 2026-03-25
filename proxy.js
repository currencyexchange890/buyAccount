import { NextResponse } from "next/server"
import { jwtVerify } from "jose"

const PUBLIC_PATHS = ["/users/login", "/users/signup"]

const USER_ONLY_PATHS = [
  "/users/dashboard",
  "/users/store",
  "/users/download",
  "/users/deposit",
  "/users/withdraw",
  "/users/transactions",
  "/users/referral",
  "/users/pricing",
    "/users/accounts",
]

const ADMIN_ONLY_PATHS = [
  "/admins/payment-method",
  "/admins/approve-deposit",
  "/admins/approve-withdraw",
  "/admins/resource-price",
  "/admins/support-setup",
  "/admins/settings-configuration",
  "/admins/user-management",
  "/admins/price-list",
]

const LOGIN_PATH = "/users/login"
const USER_HOME_PATH = "/users/dashboard"
const ADMIN_HOME_PATH = "/admins/payment-method"

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function matchesPath(pathname, route) {
  if (route === "/") return pathname === "/"
  return pathname === route || pathname.startsWith(`${route}/`)
}

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((route) => matchesPath(pathname, route))
}

function isUserOnlyPath(pathname) {
  return USER_ONLY_PATHS.some((route) => matchesPath(pathname, route))
}

function isAdminOnlyPath(pathname) {
  return ADMIN_ONLY_PATHS.some((route) => matchesPath(pathname, route))
}

function getHomeByRole(role) {
  return role === "admin" ? ADMIN_HOME_PATH : USER_HOME_PATH
}

async function verifyToken(token) {
  try {
    if (!token) return null
    if (!process.env.JWT_SECRET) return null

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    if (typeof payload.id !== "string") return null
    if (typeof payload.role !== "string") return null

    return payload
  } catch {
    return null
  }
}

export async function proxy(req) {
  const pathname = normalizePath(req.nextUrl.pathname)

  const token = req.cookies.get("token")?.value
  const auth = await verifyToken(token)

  const publicRoute = isPublicPath(pathname)
  const userOnlyRoute = isUserOnlyPath(pathname)
  const adminOnlyRoute = isAdminOnlyPath(pathname)

  if (publicRoute) {
    if (auth) {
      return NextResponse.redirect(new URL(getHomeByRole(auth.role), req.url))
    }
    return NextResponse.next()
  }

  if (userOnlyRoute) {
    if (!auth) {
      return NextResponse.redirect(new URL(LOGIN_PATH, req.url))
    }

    if (auth.role !== "user") {
      return NextResponse.redirect(new URL(getHomeByRole(auth.role), req.url))
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-user-id", auth.id)
    requestHeaders.set("x-user-role", auth.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  if (adminOnlyRoute) {
    if (!auth) {
      return NextResponse.redirect(new URL(LOGIN_PATH, req.url))
    }

    if (auth.role !== "admin") {
      return NextResponse.redirect(new URL(getHomeByRole(auth.role), req.url))
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-user-id", auth.id)
    requestHeaders.set("x-user-role", auth.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.redirect(
    new URL(auth ? getHomeByRole(auth.role) : LOGIN_PATH, req.url)
  )
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|image|.*\\..*).*)",
  ],
}