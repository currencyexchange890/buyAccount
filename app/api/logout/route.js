import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json(
    { message: "Logout success" },
    { status: 200 }
  )

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  })

  return response
}