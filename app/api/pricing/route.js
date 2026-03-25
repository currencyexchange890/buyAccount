import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import PriceList, { PACKAGE_OPTIONS } from "@/models/PriceList"
import ResourcePrice from "@/models/ResourcePrice"

function buildResourcePriceMaps(resourceConfig) {
  const items = Array.isArray(resourceConfig?.resources) ? resourceConfig.resources : []

  const byFileName = new Map()
  const byName = new Map()

  for (const item of items) {
    const normalized = {
      name: String(item?.name || "").trim(),
      fileName: String(item?.fileName || "").trim(),
      price: Number(item?.price || 0),
    }

    if (normalized.fileName) {
      byFileName.set(normalized.fileName, normalized)
    }

    if (normalized.name) {
      byName.set(normalized.name.toLowerCase(), normalized)
    }
  }

  return { byFileName, byName }
}

function getResourceMeta(resource, priceMaps) {
  const fileName = String(resource?.fileName || "").trim()
  const resourceName = String(resource?.resourceName || "").trim()

  if (fileName && priceMaps.byFileName.has(fileName)) {
    return priceMaps.byFileName.get(fileName)
  }

  if (resourceName && priceMaps.byName.has(resourceName.toLowerCase())) {
    return priceMaps.byName.get(resourceName.toLowerCase())
  }

  return {
    name: resourceName,
    fileName,
    price: 0,
  }
}

function mapPackages(packages, priceMaps) {
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
            const resourceMeta = getResourceMeta(resource, priceMaps)

            const unitPrice = Number(resourceMeta?.price || 0)
            const minQty = Number(resource.minQty || 0)
            const maxQty = Number(resource.maxQty || 0)

            const resolvedFileName =
              String(resourceMeta?.fileName || "").trim() || String(resource.fileName || "").trim()

            return {
              id: `${item._id.toString()}-${index + 1}`,
              resourceName:
                String(resourceMeta?.name || "").trim() || String(resource.resourceName || "").trim(),
              fileName: resolvedFileName,
              image: `/image/${encodeURIComponent(resolvedFileName)}`,
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

    const [packages, resourceConfig] = await Promise.all([
      PriceList.find({}).lean(),
      ResourcePrice.findOne({ configKey: "main" }).lean(),
    ])

    const priceMaps = buildResourcePriceMaps(resourceConfig)

    return NextResponse.json(
      {
        packages: mapPackages(packages, priceMaps),
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