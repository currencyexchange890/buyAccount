import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import PriceList, { PACKAGE_OPTIONS } from "@/models/PriceList"
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

function buildResourceMap(resourceConfig) {
  return new Map(
    resourceConfig.resources.map((item) => [
      item.fileName,
      {
        name: item.name,
        fileName: item.fileName,
        price: Number(item.price || 0),
      },
    ])
  )
}

function mapResourceOptions(resourceConfig) {
  return resourceConfig.resources.map((item, index) => ({
    id: index + 1,
    name: item.name,
    fileName: item.fileName,
    image: `/image/${encodeURIComponent(item.fileName)}`,
    price: Number(item.price || 0),
  }))
}

function mapPackages(packages) {
  return [...packages]
    .sort(
      (a, b) =>
        PACKAGE_OPTIONS.indexOf(a.packageName) - PACKAGE_OPTIONS.indexOf(b.packageName)
    )
    .map((item) => ({
      id: item._id.toString(),
      packageName: item.packageName,
      price: String(item.price),
      validityHours: String(item.validityHours),
      minResourceValue: Number(item.minResourceValue || 0),
      maxResourceValue: Number(item.maxResourceValue || 0),
      packageResources: item.packageResources.map((resource, index) => ({
        rowId: `${item._id.toString()}-${index + 1}`,
        resourceName: resource.resourceName,
        fileName: resource.fileName,
        image: `/image/${encodeURIComponent(resource.fileName)}`,
        minQty: String(resource.minQty),
        maxQty: String(resource.maxQty),
      })),
    }))
}

function validatePackageBody(body, resourceMap) {
  const packageName = body.packageName?.trim()
  const price = Number(body.price)
  const validityHours = Number(body.validityHours)
  const packageResources = Array.isArray(body.packageResources)
    ? body.packageResources
    : []

  if (!PACKAGE_OPTIONS.includes(packageName)) {
    return { error: "Invalid package name" }
  }

  if (Number.isNaN(price) || price <= 0) {
    return { error: "Price must be a valid number" }
  }

  if (Number.isNaN(validityHours) || validityHours <= 0) {
    return { error: "Validity hours must be a valid number" }
  }

  if (!packageResources.length) {
    return { error: "At least one resource is required" }
  }

  const normalizedResources = []
  let minResourceValue = 0
  let maxResourceValue = 0

  for (const row of packageResources) {
    const fileName = row.fileName?.trim()
    const resource = resourceMap.get(fileName)
    const minQty = Number(row.minQty)
    const maxQty = Number(row.maxQty)

    if (!resource) {
      return { error: "Invalid resource selected" }
    }

    if (Number.isNaN(minQty) || minQty <= 0) {
      return { error: "Minimum quantity must be greater than 0" }
    }

    if (Number.isNaN(maxQty) || maxQty <= 0) {
      return { error: "Maximum quantity must be greater than 0" }
    }

    if (maxQty < minQty) {
      return { error: "Maximum quantity must be greater than or equal to minimum quantity" }
    }

    normalizedResources.push({
      resourceName: resource.name,
      fileName: resource.fileName,
      minQty,
      maxQty,
    })

    minResourceValue += resource.price * minQty
    maxResourceValue += resource.price * maxQty
  }

  return {
    payload: {
      packageName,
      price,
      validityHours,
      packageResources: normalizedResources,
      minResourceValue,
      maxResourceValue,
    },
  }
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

    const resourceConfig = await getOrCreateResourceConfig()
    const packages = await PriceList.find({}).lean()

    return NextResponse.json(
      {
        resourceOptions: mapResourceOptions(resourceConfig),
        packages: mapPackages(packages),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(req) {
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

    await connectDB()

    const resourceConfig = await getOrCreateResourceConfig()
    const resourceMap = buildResourceMap(resourceConfig)

    const validated = validatePackageBody(body, resourceMap)
    if (validated.error) {
      return NextResponse.json({ message: validated.error }, { status: 400 })
    }

    const existing = await PriceList.findOne({
      packageName: validated.payload.packageName,
    })

    if (existing) {
      return NextResponse.json(
        { message: "This package already exists" },
        { status: 409 }
      )
    }

    await PriceList.create(validated.payload)

    const packages = await PriceList.find({}).lean()

    return NextResponse.json(
      {
        message: "Package created successfully",
        packages: mapPackages(packages),
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
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
    const id = body.id?.trim()

    if (!id) {
      return NextResponse.json({ message: "Package id is required" }, { status: 400 })
    }

    await connectDB()

    const resourceConfig = await getOrCreateResourceConfig()
    const resourceMap = buildResourceMap(resourceConfig)

    const validated = validatePackageBody(body, resourceMap)
    if (validated.error) {
      return NextResponse.json({ message: validated.error }, { status: 400 })
    }

    const duplicate = await PriceList.findOne({
      packageName: validated.payload.packageName,
      _id: { $ne: id },
    })

    if (duplicate) {
      return NextResponse.json(
        { message: "Another package already uses this name" },
        { status: 409 }
      )
    }

    const updated = await PriceList.findByIdAndUpdate(id, validated.payload, {
      new: true,
      runValidators: true,
    })

    if (!updated) {
      return NextResponse.json({ message: "Package not found" }, { status: 404 })
    }

    const packages = await PriceList.find({}).lean()

    return NextResponse.json(
      {
        message: "Package updated successfully",
        packages: mapPackages(packages),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function DELETE(req) {
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
    const id = body.id?.trim()

    if (!id) {
      return NextResponse.json({ message: "Package id is required" }, { status: 400 })
    }

    await connectDB()

    const deleted = await PriceList.findByIdAndDelete(id)

    if (!deleted) {
      return NextResponse.json({ message: "Package not found" }, { status: 404 })
    }

    const packages = await PriceList.find({}).lean()

    return NextResponse.json(
      {
        message: "Package deleted successfully",
        packages: mapPackages(packages),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}