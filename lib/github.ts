const GITHUB_API = "https://api.github.com"

export function getGitHubOAuthURL(origin: string) {
  const clientId = process.env.GITHUB_CLIENT_ID!
  const redirectUri = `${origin}/api/github/callback`
  const scope = "read:user,public_repo"
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${Math.random().toString(36).slice(2)}`
}

export async function exchangeGitHubCode(code: string): Promise<{ access_token: string; token_expires_at: string | null }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  if (!res.ok) throw new Error("Failed to exchange code")

  const data = await res.json()
  if (data.error) throw new Error(data.error_description ?? data.error)

  return {
    access_token: data.access_token,
    token_expires_at: null,
  }
}

export async function getGitHubUser(token: string): Promise<{ id: number; login: string; avatar_url: string }> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch GitHub user")
  return res.json()
}

export async function getGitHubRepos(token: string): Promise<any[]> {
  const repos: any[] = []
  let page = 1
  while (true) {
    const res = await fetch(`${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated&type=public`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch repos")
    const data = await res.json()
    if (data.length === 0) break
    repos.push(...data)
    page++
  }
  return repos
}

export async function getGitHubCommits(token: string, owner: string, repo: string, since: string, until: string): Promise<any[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=100&since=${since}&until=${until}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  return res.json()
}

export async function getCommitActivity(token: string, repos: { full_name: string; owner: string }[], date: string) {
  const since = `${date}T00:00:00Z`
  const until = `${date}T23:59:59Z`

  const results: {
    commits: { sha: string; message: string; url: string; repo: string }[]
    repos_touched: string[]
    languages: Set<string>
    total_commits: number
  } = {
    commits: [],
    repos_touched: [],
    languages: new Set(),
    total_commits: 0,
  }

  for (const repo of repos) {
    const [owner, name] = repo.full_name.split("/")
    const commits = await getGitHubCommits(token, owner, name, since, until)
    if (commits.length > 0) {
      results.repos_touched.push(repo.full_name)
      for (const c of commits) {
        results.commits.push({
          sha: c.sha,
          message: c.commit?.message ?? "",
          url: c.html_url,
          repo: repo.full_name,
        })
      }
      results.total_commits += commits.length
    }
  }

  return results
}

export async function getRepoLanguages(token: string, repos: { full_name: string }[]): Promise<string[]> {
  const allLangs = new Set<string>()
  for (const repo of repos.slice(0, 10)) {
    const res = await fetch(`${GITHUB_API}/repos/${repo.full_name}/languages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const langs = await res.json()
      Object.keys(langs).forEach((l) => allLangs.add(l))
    }
  }
  return Array.from(allLangs).slice(0, 5)
}
