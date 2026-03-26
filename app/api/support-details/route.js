import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import SupportDetails from "@/models/SupportDetails"

export async function GET() {
  try {
    await connectDB()

    const support = await SupportDetails.findOne({ configKey: "main" })
      .select("forgotPasswordNumber telegramGroupLink customerCareLink")
      .lean()

    return NextResponse.json(
      {
        forgotPasswordNumber: support?.forgotPasswordNumber || "",
        telegramGroupLink: support?.telegramGroupLink || "",
        customerCareLink: support?.customerCareLink || "",
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        forgotPasswordNumber: "",
        telegramGroupLink: "",
        customerCareLink: "",
      },
      { status: 200 }
    )
  }
}
