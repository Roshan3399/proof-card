import { createAdminClient } from "@/lib/supabase/admin"
import { getCommitActivity, getRepoLanguages } from "@/lib/github"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: conn } = await supabase
      .from("github_connections")
      .select("access_token, github_username")
      .eq("user_id", user.id)
      .single()

    if (!conn) return NextResponse.json({ repos: [], commits: [], languages: [], total_commits: 0 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0]

    const { data: repos } = await supabase
      .from("github_repos")
      .select("full_name")
      .eq("user_id", user.id)

    const repoList = (repos ?? []).map((r) => ({
      full_name: r.full_name,
      owner: conn.github_username,
    }))

    const activity = await getCommitActivity(conn.access_token, repoList, date)
    const languages = await getRepoLanguages(conn.access_token, repoList)

    return NextResponse.json({
      commits: activity.commits,
      repos: activity.repos_touched,
      languages,
      total_commits: activity.total_commits,
    })
  } catch {
    return NextResponse.json({ repos: [], commits: [], languages: [], total_commits: 0 })
  }
}
