import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

export async function getAuthUserId() {
  const cookieStore = await cookies()

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("accessToken")?.value ||
    cookieStore.get("authToken")?.value

  if (!token) return null

  try {
    let payload = null

    if (process.env.JWT_SECRET) {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } else {
      payload = jwt.decode(token)
    }

    if (!payload) return null

    return payload.userId || payload.id || payload._id || null
  } catch (error) {
    console.error("Token parse error:", error)
    return null
  }
}