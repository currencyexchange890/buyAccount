import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import connectDB from "@/lib/db"
import Resource from "@/models/Resource"
import PriceList from "@/models/PriceList"
import Account from "@/models/Account"
import { getAllResourcesLean, normalizeResourceImage } from "@/lib/resource-utils"

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

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function getResponseResources() {
  return getAllResourcesLean()
}

async function snapshotDeletedResource(resourceDoc) {
  const resourceId = String(resourceDoc?._id || "")
  const resourceName = String(resourceDoc?.name || "").trim()
  const fileName = String(resourceDoc?.fileName || "").trim()
  const imageUrl = normalizeResourceImage(resourceDoc)
  const unitPrice = Number(resourceDoc?.price || 0)

  const packageMatchQuery = {
    $or: [
      { "packageResources.resourceId": resourceId },
      ...(fileName ? [{ "packageResources.fileName": fileName }] : []),
      ...(resourceName ? [{ "packageResources.resourceName": resourceName }] : []),
    ],
  }

  const matchingPackages = await PriceList.find(packageMatchQuery)

  for (const pkg of matchingPackages) {
    let changed = false

    pkg.packageResources = (pkg.packageResources || []).map((row) => {
      const rowResourceId = String(row?.resourceId || "").trim()
      const rowFileName = String(row?.fileName || "").trim()
      const rowResourceName = String(row?.resourceName || "").trim()
      const matches =
        (resourceId && rowResourceId === resourceId) ||
        (fileName && rowFileName === fileName) ||
        (resourceName && rowResourceName === resourceName)

      if (!matches) {
        return row
      }

      changed = true

      return {
        ...row,
        resourceId: rowResourceId || resourceId,
        resourceName: rowResourceName || resourceName,
        fileName: rowFileName || fileName,
        imageUrl: String(row?.imageUrl || "").trim() || imageUrl,
        unitPrice: Number(row?.unitPrice || 0) > 0 ? Number(row.unitPrice) : unitPrice,
      }
    })

    if (changed) {
      await pkg.save()
    }
  }

  const accountMatchQuery = {
    $or: [
      { "resources.resourceId": resourceId },
      ...(fileName ? [{ "resources.fileName": fileName }] : []),
      ...(resourceName ? [{ "resources.resourceName": resourceName }] : []),
      { "activity.timeline.resourceId": resourceId },
      ...(fileName ? [{ "activity.timeline.fileName": fileName }] : []),
      ...(resourceName ? [{ "activity.timeline.resourceName": resourceName }] : []),
    ],
  }

  const matchingAccounts = await Account.find(accountMatchQuery)

  for (const account of matchingAccounts) {
    let changed = false

    account.resources = (account.resources || []).map((row) => {
      const rowResourceId = String(row?.resourceId || "").trim()
      const rowFileName = String(row?.fileName || "").trim()
      const rowResourceName = String(row?.resourceName || "").trim()
      const matches =
        (resourceId && rowResourceId === resourceId) ||
        (fileName && rowFileName === fileName) ||
        (resourceName && rowResourceName === resourceName)

      if (!matches) {
        return row
      }

      changed = true

      return {
        ...row,
        resourceId: rowResourceId || resourceId,
        resourceName: rowResourceName || resourceName,
        fileName: rowFileName || fileName,
        imageUrl: String(row?.imageUrl || "").trim() || imageUrl,
      }
    })

    if (Array.isArray(account.activity?.timeline)) {
      account.activity.timeline = account.activity.timeline.map((row) => {
        const rowResourceId = String(row?.resourceId || "").trim()
        const rowFileName = String(row?.fileName || "").trim()
        const rowResourceName = String(row?.resourceName || "").trim()
        const matches =
          (resourceId && rowResourceId === resourceId) ||
          (fileName && rowFileName === fileName) ||
          (resourceName && rowResourceName === resourceName)

        if (!matches) {
          return row
        }

        changed = true

        return {
          ...row,
          resourceId: rowResourceId || resourceId,
          resourceName: rowResourceName || resourceName,
          fileName: rowFileName || fileName,
          imageUrl: String(row?.imageUrl || "").trim() || imageUrl,
        }
      })
    }

    if (changed) {
      await account.save()
    }
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

    const resources = await getResponseResources()

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
    const name = String(body?.name || "").trim()
    const fileName = String(body?.fileName || "").trim()
    const imageUrl = String(body?.imageUrl || "").trim()
    const cloudinaryPublicId = String(body?.cloudinaryPublicId || "").trim()
    const price = Number(body?.price)

    if (!name) {
      return NextResponse.json(
        { message: "Image name is required" },
        { status: 400 }
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        { message: "Image upload is required" },
        { status: 400 }
      )
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { message: "Rate must be a valid number" },
        { status: 400 }
      )
    }

    await connectDB()

    const duplicate = await Resource.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    }).lean()

    if (duplicate) {
      return NextResponse.json(
        { message: "A resource with this name already exists" },
        { status: 409 }
      )
    }

    const baseSlug = slugify(name) || "resource"
    let slug = baseSlug
    let suffix = 2

    while (await Resource.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    await Resource.create({
      name,
      slug,
      fileName,
      imageUrl,
      cloudinaryPublicId,
      price,
      isActive: true,
    })

    const resources = await getResponseResources()

    return NextResponse.json(
      {
        message: `${name} uploaded successfully`,
        resources,
      },
      { status: 201 }
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
    const id = String(body?.id || "").trim()
    const name = String(body?.name || "").trim()
    const fileName = String(body?.fileName || "").trim()
    const imageUrl = String(body?.imageUrl || "").trim()
    const cloudinaryPublicId = String(body?.cloudinaryPublicId || "").trim()
    const price = Number(body?.price)

    if (!id) {
      return NextResponse.json(
        { message: "Resource id is required" },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { message: "Image name is required" },
        { status: 400 }
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        { message: "Image upload is required" },
        { status: 400 }
      )
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { message: "Rate must be a valid number" },
        { status: 400 }
      )
    }

    await connectDB()

    const duplicate = await Resource.findOne({
      _id: { $ne: id },
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    }).lean()

    if (duplicate) {
      return NextResponse.json(
        { message: "Another resource already uses this name" },
        { status: 409 }
      )
    }

    const updated = await Resource.findByIdAndUpdate(
      id,
      {
        name,
        slug: slugify(name) || "resource",
        fileName,
        imageUrl,
        cloudinaryPublicId,
        price,
      },
      {
        new: true,
        runValidators: true,
      }
    )

    if (!updated) {
      return NextResponse.json(
        { message: "Resource not found" },
        { status: 404 }
      )
    }

    const resources = await getResponseResources()

    return NextResponse.json(
      {
        message: `${name} updated successfully`,
        resources,
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
      return NextResponse.json(
        { message: "Resource id is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const existing = await Resource.findById(id)

    if (!existing) {
      return NextResponse.json(
        { message: "Resource not found" },
        { status: 404 }
      )
    }

    await snapshotDeletedResource(existing)
    await Resource.findByIdAndDelete(id)

    const resources = await getResponseResources()

    return NextResponse.json(
      {
        message: `${existing.name} deleted successfully`,
        resources,
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
