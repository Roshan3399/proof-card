import { createAdminClient } from "@/lib/supabase/admin"
import { exchangeGitHubCode, getGitHubUser, getGitHubRepos } from "@/lib/github"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/dashboard?github=error", request.url))
  }

  try {
    const token = await exchangeGitHubCode(code)

    const githubUser = await getGitHubUser(token.access_token)

    const supabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url))
    }

    const { data: existing } = await supabase
      .from("github_connections")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) {
      await supabase
        .from("github_connections")
        .update({
          github_id: githubUser.id,
          github_username: githubUser.login,
          access_token: token.access_token,
          token_expires_at: token.token_expires_at,
          is_active: true,
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      await supabase.from("github_connections").insert({
        user_id: user.id,
        github_id: githubUser.id,
        github_username: githubUser.login,
        access_token: token.access_token,
        token_expires_at: token.token_expires_at,
        is_active: true,
        last_sync_at: new Date().toISOString(),
      })
    }

    try {
      const repos = await getGitHubRepos(token.access_token)
      const repoInserts = repos.map((r) => ({
        user_id: user.id,
        github_repo_id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        repo_created_at: r.created_at,
        repo_updated_at: r.updated_at,
        pushed_at: r.pushed_at,
        language: r.language,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        is_private: r.private,
      }))

      for (const repo of repoInserts) {
        await supabase.from("github_repos").upsert(repo, {
          onConflict: "user_id, github_repo_id",
          ignoreDuplicates: false,
        })
      }
    } catch {
      // repo sync failure is non-fatal
    }

    return NextResponse.redirect(new URL("/dashboard?github=connected", request.url))
  } catch {
    return NextResponse.redirect(new URL("/dashboard?github=error", request.url))
  }
}
