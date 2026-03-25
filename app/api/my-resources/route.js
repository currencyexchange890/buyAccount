import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import connectDB from "@/lib/db"
import User from "@/models/User"
import ResourcePrice, { defaultResources } from "@/models/ResourcePrice"
import MyResource, { defaultMyResources } from "@/models/MyResource"

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

async function getOrCreateMyResource(userId) {
  let doc = await MyResource.findOne({ userId })

  if (!doc) {
    doc = await MyResource.create({
      userId,
      resources: defaultMyResources,
    })
  }

  const existingNames = new Set(
    Array.isArray(doc.resources) ? doc.resources.map((item) => item.name) : []
  )

  let changed = false

  for (const item of defaultMyResources) {
    if (!existingNames.has(item.name)) {
      doc.resources.push({
        name: item.name,
        stock: 0,
      })
      changed = true
    }
  }

  if (changed) {
    await doc.save()
  }

  return doc
}

async function getResourcePriceConfig() {
  let config = await ResourcePrice.findOne({ configKey: "main" })

  if (!config) {
    config = await ResourcePrice.create({
      configKey: "main",
      resources: defaultResources,
    })
  }

  return config
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

    const [myResource, resourcePrice] = await Promise.all([
      getOrCreateMyResource(auth.id),
      getResourcePriceConfig(),
    ])

    const stockMap = new Map(
      (myResource.resources || []).map((item) => [item.name, Number(item.stock || 0)])
    )

    const resources = (resourcePrice.resources || [])
      .filter((item) => {
        const hasName = typeof item?.name === "string" && item.name.trim() !== ""
        const hasFileName =
          typeof item?.fileName === "string" && item.fileName.trim() !== ""
        const hasPrice = Number.isFinite(Number(item?.price))
        return hasName && hasFileName && hasPrice
      })
      .map((item, index) => {
        const name = item.name.trim()
        const stock = Number(stockMap.get(name) || 0)
        const price = Number(item.price || 0)

        return {
          id: index + 1,
          name,
          fileName: item.fileName.trim(),
          image: `/image/${encodeURIComponent(item.fileName.trim())}`,
          stock,
          price,
          total: normalizeMoney(stock * price),
        }
      })

    return NextResponse.json(
      {
        resources,
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
    const resourceName = body.resourceName?.trim()

    if (!resourceName) {
      return NextResponse.json(
        { message: "Resource name is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const [user, myResource, resourcePrice] = await Promise.all([
      User.findById(auth.id),
      getOrCreateMyResource(auth.id),
      getResourcePriceConfig(),
    ])

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const stockItem = myResource.resources.find((item) => item.name === resourceName)

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

    const priceItem = (resourcePrice.resources || []).find(
      (item) => item.name === resourceName
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
        message: `${resourceName} sold successfully`,
        sold: {
          name: resourceName,
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