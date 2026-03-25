import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import { getAuthUserId } from "@/lib/auth"
import User from "@/models/User"
import PriceList from "@/models/PriceList"
import Transaction from "@/models/Transaction"
import Account from "@/models/Account"
import SettingsConfig from "@/models/SettingsConfig"

function normalizeMoney(value) {
  const number = Number(value || 0)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Number(number.toFixed(2))
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getRandomInt(min, max) {
  const safeMin = Math.max(0, Math.floor(Number(min || 0)))
  const safeMax = Math.max(safeMin, Math.floor(Number(max || 0)))

  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}

function randomDigits(length) {
  let output = ""

  for (let i = 0; i < length; i += 1) {
    output += Math.floor(Math.random() * 10)
  }

  return output
}

function shuffleArray(items) {
  const next = Array.isArray(items) ? [...items] : []

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }

  return next
}

function normalizeResourceKey(value) {
  return String(value || "").trim().toLowerCase()
}

function makeUsernameBase(fullName) {
  const compact = String(fullName || "")
    .trim()
    .replace(/\s+/g, "")
    .normalize("NFKD")
    .replace(/[^\w]/g, "")
    .replace(/_/g, "")
    .toLowerCase()

  return compact || "user"
}

async function generateUniqueCredentials(fullName) {
  const usernameBase = makeUsernameBase(fullName).slice(0, 18)

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const username = `${usernameBase}${randomDigits(5)}`
    const password = randomDigits(8)

    const exists = await Account.exists({ username })

    if (!exists) {
      return { username, password }
    }
  }

  throw new Error("Failed to generate unique username")
}

function buildAccountResources(packageResources) {
  const items = Array.isArray(packageResources) ? packageResources : []
  const map = new Map()

  for (const item of items) {
    const resourceName = String(item?.resourceName || "").trim()
    const fileName = String(item?.fileName || "").trim()
    const quantity = getRandomInt(item?.minQty, item?.maxQty)
    const key = normalizeResourceKey(resourceName)

    if (!key || quantity <= 0) continue

    if (!map.has(key)) {
      map.set(key, {
        resourceName,
        fileName,
        quantity: 0,
        claimedQuantity: 0,
      })
    }

    const current = map.get(key)
    current.quantity += quantity

    if (!current.fileName && fileName) {
      current.fileName = fileName
    }
  }

  return Array.from(map.values())
}

function sumTotalResources(resources) {
  return (Array.isArray(resources) ? resources : []).reduce((sum, item) => {
    return sum + Math.max(0, Math.floor(Number(item?.quantity || 0)))
  }, 0)
}

function pickSpreadIndexes(bucketCount, picks) {
  const safeBucketCount = Math.max(0, Math.floor(Number(bucketCount || 0)))
  const safePicks = Math.max(0, Math.floor(Number(picks || 0)))

  if (safeBucketCount <= 0 || safePicks <= 0) {
    return []
  }

  if (safePicks >= safeBucketCount) {
    return Array.from({ length: safeBucketCount }, (_, index) => index)
  }

  const indexes = []
  const used = new Set()
  const segment = safeBucketCount / safePicks
  const offset = Math.random() * segment

  for (let i = 0; i < safePicks; i += 1) {
    let target = Math.floor(offset + i * segment) % safeBucketCount

    while (used.has(target)) {
      target = (target + 1) % safeBucketCount
    }

    used.add(target)
    indexes.push(target)
  }

  return indexes.sort((a, b) => a - b)
}

function distributeQuantityAcrossBuckets(quantity, bucketCount) {
  const safeQuantity = Math.max(0, Math.floor(Number(quantity || 0)))
  const safeBucketCount = Math.max(1, Math.floor(Number(bucketCount || 1)))

  const result = Array(safeBucketCount).fill(0)

  if (safeQuantity <= 0) {
    return result
  }

  const base = Math.floor(safeQuantity / safeBucketCount)
  const remainder = safeQuantity % safeBucketCount

  for (let i = 0; i < safeBucketCount; i += 1) {
    result[i] = base
  }

  const bonusIndexes = pickSpreadIndexes(safeBucketCount, remainder)

  for (const index of bonusIndexes) {
    result[index] += 1
  }

  return result
}

function buildDropPlan(resources, validityHours, coolDownMinutes, tapsPerCycle) {
  const safeValidityHours = Math.max(1, Math.floor(Number(validityHours || 1)))
  const safeCoolDownMinutes = Math.max(
    1,
    Math.floor(Number(coolDownMinutes || 1))
  )
  const safeTapsPerCycle = Math.max(1, Math.floor(Number(tapsPerCycle || 1)))

  const totalCycles = Math.max(
    1,
    Math.floor((safeValidityHours * 60) / safeCoolDownMinutes)
  )

  const totalDrops = sumTotalResources(resources)
  const totalTapSlots = totalCycles * safeTapsPerCycle

  if (totalDrops <= 0) {
    return {
      ok: false,
      message: "Package resources are not configured properly",
    }
  }

  if (totalDrops > totalTapSlots) {
    return {
      ok: false,
      message:
        "Total resource drops exceed total available taps. Increase taps or reduce resource quantity.",
    }
  }

  const cycleDrops = Array.from({ length: totalCycles }, () => [])

  for (const resource of Array.isArray(resources) ? resources : []) {
    const quantity = Math.max(0, Math.floor(Number(resource?.quantity || 0)))

    if (quantity <= 0) continue

    const countsByCycle = distributeQuantityAcrossBuckets(quantity, totalCycles)

    countsByCycle.forEach((count, cycleIndex) => {
      for (let i = 0; i < count; i += 1) {
        cycleDrops[cycleIndex].push({
          resourceName: resource.resourceName,
          fileName: resource.fileName || "",
          quantity: 1,
          claim: false,
          claimedAt: null,
        })
      }
    })
  }

  const cycles = []
  const timeline = []

  for (let cycleIndex = 0; cycleIndex < cycleDrops.length; cycleIndex += 1) {
    const drops = cycleDrops[cycleIndex]

    if (drops.length > safeTapsPerCycle) {
      return {
        ok: false,
        message:
          "One or more cooldown cycles contain more drops than available taps.",
      }
    }

    const shuffledDrops = shuffleArray(drops)
    const tapIndexes = pickSpreadIndexes(safeTapsPerCycle, shuffledDrops.length)
    const tapNumbers = tapIndexes.map((index) => index + 1)

    tapNumbers.forEach((tapNumber, dropIndex) => {
      const drop = shuffledDrops[dropIndex]

      timeline.push({
        cycleNumber: cycleIndex + 1,
        tapNumber,
        resourceName: drop.resourceName,
        fileName: drop.fileName || "",
        quantity: 1,
        claim: false,
        claimedAt: null,
      })
    })

    cycles.push({
      cycleNumber: cycleIndex + 1,
      totalDrops: drops.length,
    })
  }

  timeline.sort((a, b) => {
    if (a.cycleNumber !== b.cycleNumber) {
      return a.cycleNumber - b.cycleNumber
    }

    return a.tapNumber - b.tapNumber
  })

  return {
    ok: true,
    activity: {
      tapsPerCycle: safeTapsPerCycle,
      coolDownMinutes: safeCoolDownMinutes,
      validityHours: safeValidityHours,
      totalCycles,
      totalTapSlots,
      totalDrops,
      cycles,
      timeline,
      progress: {
        currentCycle: 1,
        currentTapInCycle: 0,
        claimedDrops: 0,
        coolDownUntil: null,
        coolDownMinutes: safeCoolDownMinutes,
      },
    },
  }
}

export async function POST(req) {
  let deducted = false
  let createdAccountId = null
  let authUserId = null
  let packagePrice = 0

  try {
    authUserId = await getAuthUserId()

    if (!authUserId) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const packageId = String(body?.packageId || "").trim()

    if (!packageId || !/^[a-f\d]{24}$/i.test(packageId)) {
      return NextResponse.json(
        { message: "Valid package id is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const selectedPackage = await PriceList.findById(packageId).lean()

    if (!selectedPackage) {
      return NextResponse.json(
        { message: "Package not found" },
        { status: 404 }
      )
    }

    packagePrice = normalizeMoney(selectedPackage.price)

    if (packagePrice <= 0) {
      return NextResponse.json(
        { message: "This package is not available for purchase" },
        { status: 400 }
      )
    }

    const currentUser = await User.findById(authUserId)
      .select("fullName depositBalance")
      .lean()

    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    const currentBalance = normalizeMoney(currentUser.depositBalance)

    if (currentBalance < packagePrice) {
      return NextResponse.json(
        {
          code: "INSUFFICIENT_BALANCE",
          message:
            "You do not have enough deposit balance to purchase this package.",
          currentBalance,
          requiredAmount: packagePrice,
          shortfall: normalizeMoney(packagePrice - currentBalance),
        },
        { status: 400 }
      )
    }

    const accountResources = buildAccountResources(selectedPackage.packageResources)

    if (accountResources.length === 0) {
      return NextResponse.json(
        { message: "Package resources are not configured properly" },
        { status: 400 }
      )
    }

    const settingsConfig = await SettingsConfig.findOne({ configKey: "main" })
      .select("coolDown taps")
      .lean()

    if (!settingsConfig) {
      return NextResponse.json(
        { message: "Settings configuration is missing" },
        { status: 400 }
      )
    }

    const coolDownMinutes = Math.floor(Number(settingsConfig.coolDown || 0))
    const tapsPerCycle = Math.floor(Number(settingsConfig.taps || 0))

    if (coolDownMinutes <= 0) {
      return NextResponse.json(
        { message: "Cool down must be greater than 0 in settings configuration" },
        { status: 400 }
      )
    }

    if (tapsPerCycle <= 0) {
      return NextResponse.json(
        { message: "Taps must be greater than 0 in settings configuration" },
        { status: 400 }
      )
    }

    const validityHours = Math.max(1, Number(selectedPackage.validityHours || 1))
    const planResult = buildDropPlan(
      accountResources,
      validityHours,
      coolDownMinutes,
      tapsPerCycle
    )

    if (!planResult.ok) {
      return NextResponse.json(
        { message: planResult.message || "Failed to build account activity data" },
        { status: 400 }
      )
    }

    const credentials = await generateUniqueCredentials(currentUser.fullName)
    const expireAt = new Date(Date.now() + validityHours * 60 * 60 * 1000)

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: authUserId,
        depositBalance: { $gte: packagePrice },
      },
      {
        $inc: {
          depositBalance: -packagePrice,
        },
      },
      {
        new: true,
        select: "depositBalance",
      }
    )

    if (!updatedUser) {
      const latestUser = await User.findById(authUserId)
        .select("depositBalance")
        .lean()

      const latestBalance = normalizeMoney(latestUser?.depositBalance)

      return NextResponse.json(
        {
          code: "INSUFFICIENT_BALANCE",
          message:
            "You do not have enough deposit balance to purchase this package.",
          currentBalance: latestBalance,
          requiredAmount: packagePrice,
          shortfall: normalizeMoney(packagePrice - latestBalance),
        },
        { status: 400 }
      )
    }

    deducted = true

    const account = await Account.create({
      ownerId: authUserId,
      packageId: selectedPackage._id,
      packageName: selectedPackage.packageName,
      price: packagePrice,
      validityHours,
      status: true,
      username: credentials.username,
      password: credentials.password,
      resources: accountResources,
      activity: planResult.activity,
      expireAt,
    })

    createdAccountId = account._id

    await Transaction.create({
      userId: authUserId,
      amount: packagePrice,
      type: "purchase",
      note: `You purchased the ${selectedPackage.packageName} package for BDT ${formatMoney(
        packagePrice
      )}.`,
    })

    return NextResponse.json(
      {
        message: `${selectedPackage.packageName} package purchased successfully`,
        redirectTo: "/users/accounts",
        depositBalance: normalizeMoney(updatedUser.depositBalance),
      },
      { status: 201 }
    )
  } catch (error) {
    if (deducted && authUserId && packagePrice > 0) {
      try {
        if (createdAccountId) {
          await Account.findByIdAndDelete(createdAccountId)
        }

        await User.findByIdAndUpdate(authUserId, {
          $inc: { depositBalance: packagePrice },
        })
      } catch (rollbackError) {
        console.error("Purchase rollback failed:", rollbackError)
      }
    }

    console.error("Purchase package error:", error)

    return NextResponse.json(
      { message: "Failed to purchase package" },
      { status: 500 }
    )
  }
}