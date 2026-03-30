import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import PriceList, { PACKAGE_OPTIONS } from "@/models/PriceList"
import {
  getResourceMaps,
  normalizeResourceImage,
  resolveResourceMeta,
} from "@/lib/resource-utils"

function mapPackages(packages, resourceMaps) {
  return [...packages]
    .sort(
      (a, b) =>
        PACKAGE_OPTIONS.indexOf(a.packageName) - PACKAGE_OPTIONS.indexOf(b.packageName)
    )
    .map((item) => ({
      id: item._id.toString(),
      packageName: item.packageName,
      price: Number(item.price || 0),
      validityHours: Number(item.validityHours || 0),
      minResourceValue: Number(item.minResourceValue || 0),
      maxResourceValue: Number(item.maxResourceValue || 0),
      packageResources: Array.isArray(item.packageResources)
        ? item.packageResources.map((resource, index) => {
            const resourceMeta = resolveResourceMeta(resource, resourceMaps)
            const liveUnitPrice = Number(resourceMeta?.price || 0)
            const snapshotUnitPrice = Number(resource?.unitPrice || 0)
            const unitPrice = liveUnitPrice > 0 ? liveUnitPrice : snapshotUnitPrice
            const minQty = Number(resource.minQty || 0)
            const maxQty = Number(resource.maxQty || 0)
            const image = resourceMeta?.image || normalizeResourceImage(resource)

            return {
              id: `${item._id.toString()}-${index + 1}`,
              resourceId: String(resourceMeta?.id || resource?.resourceId || "").trim(),
              resourceName:
                String(resourceMeta?.name || resource?.resourceName || "").trim() ||
                "Resource",
              fileName:
                String(resourceMeta?.fileName || resource?.fileName || "").trim(),
              image,
              imageUrl: image,
              minQty,
              maxQty,
              unitPrice,
              minPrice: unitPrice * minQty,
              maxPrice: unitPrice * maxQty,
            }
          })
        : [],
    }))
}

export async function GET() {
  try {
    await connectDB()

    const [packages, resourceMaps] = await Promise.all([
      PriceList.find({}).lean(),
      getResourceMaps(),
    ])

    return NextResponse.json(
      {
        packages: mapPackages(packages, resourceMaps),
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "Failed to load pricing plans" },
      { status: 500 }
    )
  }
}
