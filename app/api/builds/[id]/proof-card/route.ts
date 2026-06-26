import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import type { Build, Log, GitHubConnection, GitHubRepo } from "@/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: build } = await supabase
      .from("builds")
      .select("*")
      .eq("id", id)
      .single()

    if (!build) return NextResponse.json({ error: "Build not found" }, { status: 404 })

    const b = build as unknown as Build
    const { data: logs } = await supabase
      .from("logs")
      .select("*")
      .eq("build_id", id)
      .order("created_at", { ascending: true })

    const logList = (logs ?? []) as unknown as Log[]
    const days = logList.length

    const { data: conn } = await supabase
      .from("github_connections")
      .select("*")
      .eq("user_id", user.id)
      .single()

    let githubData = {
      total_commits: 0,
      repo_count: 0,
      languages: "N/A",
      top_repo: "N/A",
      github_username: "N/A",
      avatar_url: "",
    }

    if (conn) {
      const gc = conn as unknown as GitHubConnection
      const verifiedLogs = logList.filter((l) => l.github_verified)
      const allCommits = verifiedLogs.reduce((sum, l) => sum + (l.github_commits_count ?? 0), 0)
      const allRepos = [...new Set(verifiedLogs.flatMap((l) => l.github_repos_touched ?? []))]
      const allLangs = [...new Set(verifiedLogs.flatMap((l) => l.github_languages ?? []))]

      const { data: repos } = await supabase
        .from("github_repos")
        .select("full_name, stargazers_count")
        .eq("user_id", user.id)
        .order("stargazers_count", { ascending: false })
        .limit(1)

      githubData = {
        total_commits: allCommits,
        repo_count: allRepos.length,
        languages: allLangs.slice(0, 5).join(", ") || "N/A",
        top_repo: allRepos[0] || (repos?.[0] as unknown as GitHubRepo)?.full_name || "N/A",
        github_username: gc.github_username,
        avatar_url: `https://github.com/${gc.github_username}.png`,
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, username, avatar_url")
      .eq("id", user.id)
      .single()

    const svg = generateProofCardSvg({
      buildTitle: b.title,
      days,
      ...githubData,
      userName: (profile as any)?.name ?? user.email?.split("@")[0] ?? "Builder",
      userUsername: (profile as any)?.username ?? "",
      userAvatar: (profile as any)?.avatar_url ?? githubData.avatar_url,
    })

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateProofCardSvg(data: {
  buildTitle: string
  days: number
  total_commits: number
  repo_count: number
  languages: string
  top_repo: string
  github_username: string
  userName: string
  userUsername: string
  userAvatar: string
}): string {
  const verified = data.total_commits > 0
  const badgeColor = verified ? "#00D4AA" : "#64748B"
  const badgeText = verified ? "Verified by GitHub API" : "Manual build"
  const badgeIcon = verified ? "M9 12l2 2l4-4" : "M12 8v4m0 4h.01"

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0A0F"/>
      <stop offset="100%" style="stop-color:#0F0F1A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="16" fill="none" stroke="#1E1E2E" stroke-width="1"/>

  <text x="80" y="95" font-family="system-ui, sans-serif" font-size="28" font-weight="700" fill="#00D4AA">SHIP</text>

  <text x="80" y="170" font-family="system-ui, sans-serif" font-size="48" font-weight="700" fill="#F8FAFC">PROOF OF BUILD</text>

  <text x="80" y="225" font-family="system-ui, sans-serif" font-size="32" fill="#94A3B8">${escapeXml(data.buildTitle)}</text>
  <text x="80" y="260" font-family="system-ui, sans-serif" font-size="20" fill="#64748B">Built over ${data.days} day${data.days !== 1 ? "s" : ""}</text>

  <line x1="80" y1="300" x2="1120" y2="300" stroke="#1E1E2E" stroke-width="1"/>

  <text x="80" y="345" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="${badgeColor}">${badgeIcon === "M9 12l2 2l4-4" ? "\\2713" : "\\2014"} VERIFIED ACTIVITY</text>
  <text x="80" y="385" font-family="system-ui, sans-serif" font-size="20" fill="#CBD5E1">
    <tspan x="80" dy="0">${data.total_commits > 0 ? "\\2022 " + data.total_commits + " commit" + (data.total_commits !== 1 ? "s" : "") + " across " + data.repo_count + " " + (data.repo_count === 1 ? "repo" : "repos") : "\\2022 No GitHub commits linked"}</tspan>
    <tspan x="80" dy="30">${data.languages !== "N/A" && data.languages ? "\\2022 Languages: " + data.languages : ""}</tspan>
    <tspan x="80" dy="30">${data.top_repo !== "N/A" ? "\\2022 Most active: " + data.top_repo : ""}</tspan>
  </text>

  <image x="80" y="470" width="56" height="56" rx="28" href="${escapeXml(data.userAvatar || `https://github.com/${data.github_username}.png`)}"/>
  <text x="150" y="492" font-family="system-ui, sans-serif" font-size="20" font-weight="600" fill="#F8FAFC">@${escapeXml(data.github_username !== "N/A" ? data.github_username : data.userUsername || "builder")}</text>
  <text x="150" y="516" font-family="system-ui, sans-serif" font-size="16" fill="#94A3B8">ship.so/u/${escapeXml(data.userUsername)}</text>

  <rect x="80" y="550" width="200" height="28" rx="14" fill="${badgeColor}" opacity="0.15"/>
  <text x="180" y="569" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="${badgeColor}" text-anchor="middle">${verified ? "\\2713" : "\\2014"} ${badgeText}</text>
</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
