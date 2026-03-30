import Resource from "@/models/Resource"

export function normalizeLegacyImage() {
  return ""
}

export function normalizeResourceImage(item) {
  return String(item?.imageUrl || item?.image || "").trim()
}

export function sortResourcesByPrice(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const priceDiff = Number(a?.price || 0) - Number(b?.price || 0)

    if (priceDiff !== 0) {
      return priceDiff
    }

    return String(a?.name || a?.resourceName || a?.fileName || "").localeCompare(
      String(b?.name || b?.resourceName || b?.fileName || "")
    )
  })
}

export function mapResourceDoc(item) {
  const imageUrl = normalizeResourceImage(item)

  return {
    id: String(item?._id || item?.id || "").trim(),
    resourceId: String(item?._id || item?.resourceId || item?.id || "").trim(),
    name: String(item?.name || item?.resourceName || "").trim(),
    resourceName: String(item?.resourceName || item?.name || "").trim(),
    fileName: String(item?.fileName || "").trim(),
    imageUrl,
    image: imageUrl,
    cloudinaryPublicId: String(item?.cloudinaryPublicId || "").trim(),
    price: Number(item?.price || item?.unitPrice || 0),
    unitPrice: Number(item?.unitPrice || item?.price || 0),
    isActive: item?.isActive !== false,
  }
}

export async function getAllResourcesLean(options = {}) {
  const includeInactive = options?.includeInactive === true
  const filter = includeInactive ? {} : { isActive: { $ne: false } }
  const items = await Resource.find(filter).lean()

  return sortResourcesByPrice(items.map(mapResourceDoc))
}

export async function getResourceMaps(options = {}) {
  const resources = await getAllResourcesLean(options)
  const byId = new Map()
  const byName = new Map()
  const byFileName = new Map()

  for (const item of resources) {
    if (item.id) {
      byId.set(item.id, item)
    }

    if (item.name) {
      byName.set(item.name.toLowerCase(), item)
    }

    if (item.fileName) {
      byFileName.set(item.fileName, item)
    }
  }

  return {
    resources,
    byId,
    byName,
    byFileName,
  }
}

export function resolveResourceMeta(input, resourceMaps) {
  const resourceId = String(input?.resourceId || input?.id || "").trim()
  const resourceName = String(input?.resourceName || input?.name || "").trim()
  const fileName = String(input?.fileName || "").trim()

  if (resourceId && resourceMaps?.byId?.has(resourceId)) {
    return resourceMaps.byId.get(resourceId)
  }

  if (fileName && resourceMaps?.byFileName?.has(fileName)) {
    return resourceMaps.byFileName.get(fileName)
  }

  if (resourceName && resourceMaps?.byName?.has(resourceName.toLowerCase())) {
    return resourceMaps.byName.get(resourceName.toLowerCase())
  }

  return mapResourceDoc({
    resourceId,
    resourceName,
    fileName,
    imageUrl: String(input?.imageUrl || input?.image || "").trim(),
    price: Number(input?.unitPrice || input?.price || 0),
    unitPrice: Number(input?.unitPrice || input?.price || 0),
  })
}
