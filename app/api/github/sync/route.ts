import { createAdminClient } from "@/lib/supabase/admin"
import { getGitHubRepos, getGitHubCommits } from "@/lib/github"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: connections } = await supabase
      .from("github_connections")
      .select("*")
      .eq("is_active", true)

    if (!connections) return NextResponse.json({ synced: 0 })

    for (const conn of connections) {
      try {
        const repos = await getGitHubRepos(conn.access_token)
        for (const r of repos) {
          await supabase.from("github_repos").upsert(
            {
              user_id: conn.user_id,
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
            },
            { onConflict: "user_id, github_repo_id", ignoreDuplicates: false }
          )
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        const now = new Date().toISOString()

        const { data: userRepos } = await supabase
          .from("github_repos")
          .select("id, full_name")
          .eq("user_id", conn.user_id)

        if (userRepos) {
          for (const repo of userRepos) {
            try {
              const [owner, name] = repo.full_name.split("/")
              const commits = await getGitHubCommits(conn.access_token, owner, name, sevenDaysAgo, now)
              for (const c of commits) {
                await supabase.from("github_commits").upsert(
                  {
                    repo_id: repo.id,
                    sha: c.sha,
                    message: c.commit?.message ?? "",
                    author_date: c.commit?.author?.date,
                    committer_date: c.commit?.committer?.date,
                    url: c.html_url,
                  },
                  { onConflict: "repo_id, sha", ignoreDuplicates: false }
                )
              }
            } catch {
              // per-repo sync failure is non-fatal
            }
          }
        }

        await supabase
          .from("github_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", conn.id)
      } catch {
        // per-user sync failure is non-fatal
      }
    }

    return NextResponse.json({ synced: connections.length })
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
