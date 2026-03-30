import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import PriceList, { PACKAGE_OPTIONS } from "@/models/PriceList"
import {
  getResourceMaps,
  normalizeResourceImage,
  resolveResourceMeta,
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

function sortPackageResources(resources, resourceMaps) {
  return [...(Array.isArray(resources) ? resources : [])].sort((a, b) => {
    const aMeta = resolveResourceMeta(a, resourceMaps)
    const bMeta = resolveResourceMeta(b, resourceMaps)
    const aPrice = Number(aMeta?.price || a?.unitPrice || 0)
    const bPrice = Number(bMeta?.price || b?.unitPrice || 0)
    const priceDiff = aPrice - bPrice

    if (priceDiff !== 0) {
      return priceDiff
    }

    return String(a?.resourceName || aMeta?.name || a?.fileName || "").localeCompare(
      String(b?.resourceName || bMeta?.name || b?.fileName || "")
    )
  })
}

function mapPackages(packages, resourceMaps) {
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
      packageResources: sortPackageResources(item.packageResources, resourceMaps).map(
        (resource, index) => {
          const resolved = resolveResourceMeta(resource, resourceMaps)
          const liveUnitPrice = Number(resolved?.price || 0)
          const unitPrice = liveUnitPrice > 0 ? liveUnitPrice : Number(resource?.unitPrice || 0)
          const image = resolved?.image || normalizeResourceImage(resource)

          return {
            rowId: `${item._id.toString()}-${index + 1}`,
            resourceId: String(resolved?.id || resource?.resourceId || "").trim(),
            resourceName:
              String(resolved?.name || resource?.resourceName || "").trim() ||
              "Resource",
            fileName:
              String(resolved?.fileName || resource?.fileName || "").trim(),
            image,
            imageUrl: image,
            unitPrice,
            minQty: String(resource.minQty),
            maxQty: String(resource.maxQty),
          }
        }
      ),
    }))
}

function validatePackageBody(body, resourceMaps) {
  const packageName = String(body?.packageName || "").trim()
  const price = Number(body?.price)
  const validityHours = Number(body?.validityHours)
  const packageResources = Array.isArray(body?.packageResources)
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
    const minQty = Number(row?.minQty)
    const maxQty = Number(row?.maxQty)
    const resolved = resolveResourceMeta(row, resourceMaps)

    const resourceName = String(resolved?.name || row?.resourceName || "").trim()
    const fileName = String(resolved?.fileName || row?.fileName || "").trim()
    const imageUrl = resolved?.image || normalizeResourceImage(row)
    const liveUnitPrice = Number(resolved?.price || 0)
    const snapshotUnitPrice = Number(row?.unitPrice || 0)
    const unitPrice = liveUnitPrice > 0 ? liveUnitPrice : snapshotUnitPrice

    if (!resourceName) {
      return { error: "Invalid resource selected" }
    }

    if (!imageUrl) {
      return { error: "Resource image is missing" }
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
      resourceId: String(resolved?.id || row?.resourceId || "").trim(),
      resourceName,
      fileName,
      imageUrl,
      unitPrice,
      minQty,
      maxQty,
    })

    minResourceValue += unitPrice * minQty
    maxResourceValue += unitPrice * maxQty
  }

  return {
    payload: {
      packageName,
      price,
      validityHours,
      packageResources: sortPackageResources(normalizedResources, resourceMaps),
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

    const [resourceMaps, packages] = await Promise.all([
      getResourceMaps(),
      PriceList.find({}).lean(),
    ])

    return NextResponse.json(
      {
        resourceOptions: resourceMaps.resources,
        packages: mapPackages(packages, resourceMaps),
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

    const resourceMaps = await getResourceMaps()
    const validated = validatePackageBody(body, resourceMaps)

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
        packages: mapPackages(packages, resourceMaps),
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
    const id = String(body?.id || "").trim()

    if (!id) {
      return NextResponse.json({ message: "Package id is required" }, { status: 400 })
    }

    await connectDB()

    const resourceMaps = await getResourceMaps()
    const validated = validatePackageBody(body, resourceMaps)

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
        packages: mapPackages(packages, resourceMaps),
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
    const id = String(body?.id || "").trim()

    if (!id) {
      return NextResponse.json({ message: "Package id is required" }, { status: 400 })
    }

    await connectDB()

    const resourceMaps = await getResourceMaps()
    const deleted = await PriceList.findByIdAndDelete(id)

    if (!deleted) {
      return NextResponse.json({ message: "Package not found" }, { status: 404 })
    }

    const packages = await PriceList.find({}).lean()

    return NextResponse.json(
      {
        message: "Package deleted successfully",
        packages: mapPackages(packages, resourceMaps),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
