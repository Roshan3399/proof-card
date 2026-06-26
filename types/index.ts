export interface Build {
  id: string
  user_id: string
  title: string
  description: string
  category: "code" | "design" | "writing" | "hardware" | "ai" | "other"
  status: "planning" | "building" | "testing" | "shipped"
  season_id: string
  created_at: string
  shipped_at: string | null
}

export interface Log {
  id: string
  build_id: string
  log_date: string
  content: string
  image_url: string | null
  created_at: string
  github_verified: boolean
  github_commits_count: number
  github_repos_touched: string[]
  github_languages: string[]
}

export interface GitHubConnection {
  id: string
  user_id: string
  github_id: number
  github_username: string
  access_token: string
  token_expires_at: string | null
  is_active: boolean
  connected_at: string
  last_sync_at: string | null
}

export interface GitHubRepo {
  id: string
  user_id: string
  github_repo_id: number
  name: string
  full_name: string
  description: string | null
  repo_created_at: string | null
  repo_updated_at: string | null
  pushed_at: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  is_private: boolean
}

export interface GitHubCommit {
  id: string
  repo_id: string
  sha: string
  message: string | null
  author_date: string | null
  committer_date: string | null
  url: string | null
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

export interface Cohort {
  season_id: string
  user_id: string
}

export interface Endorsement {
  id: string
  build_id: string
  endorser_name: string
  comment: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  name: string
  username: string | null
  age: number
  bio: string | null
  avatar_url: string | null
  timezone: string
  email_digest: boolean
  created_at: string
}

export interface DailyLog {
  id: string
  build_id: string
  content: string
  image_url: string | null
  created_at: string
  date: string
}
