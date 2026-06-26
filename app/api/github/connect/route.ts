import { NextResponse } from "next/server"
import { getGitHubOAuthURL } from "@/lib/github"

export async function GET() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://roshan-ship.vercel.app"
  const url = getGitHubOAuthURL(origin)
  return NextResponse.redirect(url)
}
