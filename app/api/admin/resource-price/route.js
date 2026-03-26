import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import ResourcePrice, { defaultResources } from "@/models/ResourcePrice"

function clearTokenCookie(response) {
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  })
}

async function verifyAdmin(req) {
  try {
    const token = req.cookies.get("token")?.value

    if (!token || !process.env.JWT_SECRET) {
      return { ok: false }
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    if (typeof payload.id !== "string" || typeof payload.role !== "string") {
      return { ok: false }
    }

    if (payload.role !== "admin") {
      return { ok: false }
    }

    return {
      ok: true,
      userId: payload.id,
      role: payload.role,
    }
  } catch {
    return { ok: false }
  }
}

async function getOrCreateResourceConfig() {
  let config = await ResourcePrice.findOne({ configKey: "main" })

  if (!config) {
    config = await ResourcePrice.create({
      configKey: "main",
      resources: defaultResources,
    })
  }

  if (!Array.isArray(config.resources) || config.resources.length !== defaultResources.length) {
    config.resources = defaultResources
    await config.save()
  }

  return config
}

function sortResourcesByPrice(items) {
  return [...items].sort((a, b) => {
    const priceDiff = Number(a?.price || 0) - Number(b?.price || 0)

    if (priceDiff !== 0) {
      return priceDiff
    }

    return String(a?.name || a?.fileName || "").localeCompare(
      String(b?.name || b?.fileName || "")
    )
  })
}

export async function GET(req) {
  const auth = await verifyAdmin(req)

  if (!auth.ok) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    await connectDB()

    const config = await getOrCreateResourceConfig()
    const resources = sortResourcesByPrice(
      config.resources.map((item) => ({
        name: item.name,
        fileName: item.fileName,
        image: `/image/${encodeURIComponent(item.fileName)}`,
        price: item.price ?? 0,
      }))
    ).map((item, index) => ({
      id: index + 1,
      ...item,
    }))

    return NextResponse.json(
      { resources },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}

export async function PUT(req) {
  const auth = await verifyAdmin(req)

  if (!auth.ok) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    const body = await req.json()

    const fileName = body.fileName?.trim()
    const nextPrice = Number(body.price)

    if (!fileName) {
      return NextResponse.json(
        { message: "File name is required" },
        { status: 400 }
      )
    }

    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      return NextResponse.json(
        { message: "Price must be a valid number" },
        { status: 400 }
      )
    }

    await connectDB()

    const config = await getOrCreateResourceConfig()

    const resourceIndex = config.resources.findIndex(
      (item) => item.fileName === fileName
    )

    if (resourceIndex === -1) {
      return NextResponse.json(
        { message: "Resource not found" },
        { status: 404 }
      )
    }

    config.resources[resourceIndex].price = nextPrice
    await config.save()

    const updated = config.resources[resourceIndex]

    return NextResponse.json(
      {
        message: `${updated.name} price updated successfully`,
        resource: {
          id: resourceIndex + 1,
          name: updated.name,
          fileName: updated.fileName,
          image: `/image/${encodeURIComponent(updated.fileName)}`,
          price: updated.price,
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    )
  }
}
