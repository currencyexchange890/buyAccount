import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"
import MyResource from "@/models/MyResource"
import {
  getAllResourcesLean,
  normalizeResourceImage,
  sortResourcesByPrice,
} from "@/lib/resource-utils"

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

function getAuthUser(req) {
  try {
    const token = req.cookies.get("token")?.value

    if (!token || !process.env.JWT_SECRET) return null

    const payload = jwt.verify(token, process.env.JWT_SECRET)

    if (!payload?.id) return null

    return {
      id: payload.id,
      role: payload.role,
    }
  } catch {
    return null
  }
}

function normalizeMoney(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(2))
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase()
}

async function getOrCreateMyResource(userId, catalog) {
  let doc = await MyResource.findOne({ userId })

  if (!doc) {
    doc = await MyResource.create({
      userId,
      resources: [],
    })
  }

  const items = Array.isArray(doc.resources) ? doc.resources : []
  let changed = false

  for (const resource of Array.isArray(catalog) ? catalog : []) {
    const match = items.find(
      (item) =>
        (item.resourceId && item.resourceId === resource.id) ||
        normalizeKey(item.name) === normalizeKey(resource.name)
    )

    if (match) {
      if (match.resourceId !== resource.id) {
        match.resourceId = resource.id
        changed = true
      }

      if (match.name !== resource.name) {
        match.name = resource.name
        changed = true
      }

      if ((match.fileName || "") !== (resource.fileName || "")) {
        match.fileName = resource.fileName || ""
        changed = true
      }

      if ((match.imageUrl || "") !== (resource.image || "")) {
        match.imageUrl = resource.image || ""
        changed = true
      }

      continue
    }

    doc.resources.push({
      resourceId: resource.id,
      name: resource.name,
      fileName: resource.fileName || "",
      imageUrl: resource.image || "",
      stock: 0,
    })
    changed = true
  }

  if (changed) {
    await doc.save()
  }

  return doc
}

export async function GET(req) {
  const auth = getAuthUser(req)

  if (!auth) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    await connectDB()

    const catalog = await getAllResourcesLean()
    const myResource = await getOrCreateMyResource(auth.id, catalog)

    const currentRows = catalog.map((resource) => {
      const stockItem = (myResource.resources || []).find(
        (item) =>
          (item.resourceId && item.resourceId === resource.id) ||
          normalizeKey(item.name) === normalizeKey(resource.name)
      )

      const stock = Number(stockItem?.stock || 0)
      const price = Number(resource.price || 0)

      return {
        id: resource.id,
        resourceId: resource.id,
        name: resource.name,
        fileName: resource.fileName || "",
        image: resource.image,
        imageUrl: resource.image,
        stock,
        price,
        total: normalizeMoney(stock * price),
      }
    })

    const orphanRows = (myResource.resources || [])
      .filter((item) => {
        const stock = Number(item?.stock || 0)
        if (stock <= 0) {
          return false
        }

        return !catalog.some(
          (resource) =>
            (item.resourceId && item.resourceId === resource.id) ||
            normalizeKey(item.name) === normalizeKey(resource.name)
        )
      })
      .map((item, index) => ({
        id: item.resourceId || `orphan-${index + 1}`,
        resourceId: item.resourceId || "",
        name: String(item.name || "Unknown Resource").trim(),
        fileName: String(item.fileName || "").trim(),
        image: normalizeResourceImage(item),
        imageUrl: normalizeResourceImage(item),
        stock: Number(item.stock || 0),
        price: 0,
        total: 0,
        unavailable: true,
      }))

    return NextResponse.json(
      {
        resources: sortResourcesByPrice([...currentRows, ...orphanRows]),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load resources" },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  const auth = getAuthUser(req)

  if (!auth) {
    const response = NextResponse.json(
      { message: "Unauthorized access" },
      { status: 401 }
    )
    clearTokenCookie(response)
    return response
  }

  try {
    const body = await req.json()
    const resourceId = String(body?.resourceId || "").trim()
    const resourceName = String(body?.resourceName || "").trim()

    if (!resourceId && !resourceName) {
      return NextResponse.json(
        { message: "Resource is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const [user, catalog] = await Promise.all([
      User.findById(auth.id),
      getAllResourcesLean(),
    ])

    const myResource = await getOrCreateMyResource(auth.id, catalog)

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const stockItem = (myResource.resources || []).find(
      (item) =>
        (resourceId && item.resourceId === resourceId) ||
        normalizeKey(item.name) === normalizeKey(resourceName)
    )

    if (!stockItem) {
      return NextResponse.json(
        { message: "Resource not found in your store" },
        { status: 404 }
      )
    }

    const stock = Number(stockItem.stock || 0)

    if (stock <= 0) {
      return NextResponse.json(
        { message: "No stock available for this resource" },
        { status: 400 }
      )
    }

    const priceItem = catalog.find(
      (item) =>
        (resourceId && item.id === resourceId) ||
        normalizeKey(item.name) === normalizeKey(stockItem.name)
    )

    if (!priceItem) {
      return NextResponse.json(
        { message: "Resource price not found" },
        { status: 404 }
      )
    }

    const price = Number(priceItem.price || 0)
    const totalAmount = normalizeMoney(stock * price)

    stockItem.stock = 0
    user.withdrawBalance = normalizeMoney(
      Number(user.withdrawBalance || 0) + totalAmount
    )

    await Promise.all([myResource.save(), user.save()])

    return NextResponse.json(
      {
        message: `${stockItem.name} sold successfully`,
        sold: {
          resourceId: stockItem.resourceId || priceItem.id,
          name: stockItem.name,
          soldStock: stock,
          price,
          totalAmount,
          stock: 0,
          withdrawBalance: Number(user.withdrawBalance || 0),
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to sell resource" },
      { status: 500 }
    )
  }
}
