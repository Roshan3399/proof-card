"use client"

import { Suspense, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Plus, Flame, Calendar, Check, ShipIcon, AlertTriangle, Folder, ExternalLink } from "lucide-react"
import { DashboardSkeleton } from "@/components/skeleton"
import { Nav } from "@/components/nav"
import { calculateStreak } from "@/lib/streak"
import type { Build, Log, Season, Profile } from "@/types"

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeBuilds, setActiveBuilds] = useState<Build[]>([])
  const [buildsWithStreaks, setBuildsWithStreaks] = useState<{ build: Build; streak: number; loggedToday: boolean }[]>([])
  const [pastBuilds, setPastBuilds] = useState<Build[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [cohort, setCohort] = useState<{ name: string; build_title: string; id: string }[]>([])

  const [githubConnected, setGithubConnected] = useState(false)
  const [githubUsername, setGithubUsername] = useState("")
  const [githubActivity, setGithubActivity] = useState<{
    commits: { sha: string; message: string; url: string; repo: string }[]
    repos: string[]
    languages: string[]
    total_commits: number
  } | null>(null)
  const [githubBanner, setGithubBanner] = useState<string | null>(null)

  useEffect(() => {
    const gb = searchParams.get("github")
    if (gb === "connected") setGithubBanner("connected")
    else if (gb === "error") setGithubBanner("error")
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUser(user)

      const promises = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("seasons").select("*").eq("is_active", true).single(),
        supabase.from("builds").select("*").eq("user_id", user.id).not("status", "eq", "shipped").order("created_at", { ascending: false }),
        supabase.from("builds").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("github_connections").select("github_username").eq("user_id", user.id).maybeSingle(),
      ])

      const p = promises[0].data
      const activeSeason = promises[1].data
      const builds = promises[2].data
      const allUserBuilds = promises[3].data
      const githubConn = promises[4].data

      if (p) setProfile(p as unknown as Profile)
      if (activeSeason) setSeason(activeSeason)

      if (githubConn) {
        setGithubConnected(true)
        setGithubUsername((githubConn as any).github_username)
        fetchGithubActivity()
      }

      const buildList = (allUserBuilds ?? []) as unknown as Build[]
      setPastBuilds(buildList.filter((b) => b.status === "shipped"))

      if (builds && builds.length > 0) {
        const active = builds as unknown as Build[]
        setActiveBuilds(active)

        const today = new Date().toISOString().split("T")[0]

        const streaks = await Promise.all(
          active.map(async (build) => {
            const { data: logs } = await supabase
              .from("logs")
              .select("*")
              .eq("build_id", build.id)
              .order("created_at", { ascending: false })

            const logList = (logs ?? []) as unknown as Log[]
            return {
              build,
              streak: calculateStreak(logList),
              loggedToday: logList.some((l) => l.log_date === today || l.created_at?.startsWith(today)),
            }
          })
        )
        setBuildsWithStreaks(streaks)
      }

      const { data: cohortData } = await supabase
        .from("cohorts")
        .select("user_id")
        .eq("season_id", activeSeason?.id)

      if (cohortData && activeSeason) {
        const others = cohortData.filter((c) => c.user_id !== user.id).slice(0, 5)
        const info = await Promise.all(
          others.map(async (c) => {
            const { data: p } = await supabase.from("profiles").select("name, username").eq("id", c.user_id).single()
            const { data: b } = await supabase
              .from("builds")
              .select("title")
              .eq("user_id", c.user_id)
              .not("status", "eq", "shipped")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            const prof = p as unknown as { name: string; username: string | null } | null
            return {
              name: prof?.name ?? "Builder",
              id: prof?.username ?? c.user_id,
              build_title: (b as unknown as { title: string })?.title ?? "No active build",
            }
          })
        )
        setCohort(info)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function fetchGithubActivity() {
    try {
      const today = new Date().toISOString().split("T")[0]
      const res = await fetch(`/api/github/activity?date=${today}`)
      if (res.ok) {
        const data = await res.json()
        setGithubActivity(data)
      }
    } catch {}
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return <DashboardSkeleton />

  const seasonEnd = season ? Math.ceil((new Date(season.end_date).getTime() - Date.now()) / 86400000) : 0
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const allLoggedToday = buildsWithStreaks.every((b) => b.loggedToday)
  const hasPendingLogs = buildsWithStreaks.some((b) => !b.loggedToday)
  const isStreakDanger = hasPendingLogs && hour >= 22 && hour < 23
  const isStreakCritical = hasPendingLogs && (hour >= 23 || (hour === 22 && minute >= 30))
  const isStreakLost = hasPendingLogs && hour === 0 && minute < 5

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-semibold tracking-tight text-foreground">
            Ship
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={profile?.username ? `/profile/${profile.username}` : `/profile/${user?.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Profile
            </Link>
            <button onClick={handleLogout} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log out
            </button>
          </div>
        </div>
      </header>

      <Nav />

      <main className="mx-auto max-w-2xl px-4 py-8 pb-24">
        {githubBanner === "connected" && (
          <div className="mb-6 rounded-xl border border-ship/30 bg-ship/10 p-4 text-center">
            <p className="text-sm text-ship font-medium">GitHub connected. Your commits will now verify your logs.</p>
          </div>
        )}
        {githubBanner === "error" && (
          <div className="mb-6 rounded-xl border border-red/30 bg-red/10 p-4 text-center">
            <p className="text-sm text-red font-medium">GitHub connection failed. Try again.</p>
          </div>
        )}

        {isStreakLost && (
          <div className="mb-6 rounded-xl border border-red/30 bg-red/10 p-4 text-center">
            <p className="text-sm text-red font-medium">Streak broken for {buildsWithStreaks.filter(b => !b.loggedToday).length} build{buildsWithStreaks.filter(b => !b.loggedToday).length !== 1 ? "s" : ""}. It happens. Start again today.</p>
          </div>
        )}

        {isStreakCritical && (
          <div className="mb-6 rounded-xl border border-red/30 bg-red/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red" />
              <p className="text-sm text-red font-medium">Ship your log before midnight or lose your streak.</p>
            </div>
          </div>
        )}

        {isStreakDanger && (
          <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber" />
              <p className="text-sm text-amber font-medium">Ship your log soon. Streak expires at midnight.</p>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className={`h-5 w-5 ${githubConnected ? "text-ship" : "text-muted-foreground"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {githubConnected ? `GitHub: @${githubUsername}` : "Connect GitHub"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {githubConnected
                    ? "Logs auto-verified against commit activity"
                    : "Prove your builds with real commits"}
                </p>
              </div>
            </div>
            {githubConnected ? (
              <button
                onClick={async () => {
                  await fetch("/api/github/disconnect", { method: "POST" })
                  setGithubConnected(false)
                  setGithubUsername("")
                  setGithubActivity(null)
                }}
                className="text-xs text-muted-foreground hover:text-red transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <Link href="/api/github/connect">
                <button className="rounded-lg bg-ship px-4 py-1.5 text-xs font-medium text-background hover:bg-ship/90 transition-all">
                  Connect
                </button>
              </Link>
            )}
          </div>
        </div>

        {activeBuilds.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-card border border-border">
              <Folder className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Your builds folder is empty</h2>
            <p className="text-sm text-muted-foreground mb-8">Every great builder starts with one plank.</p>
            <Link href="/builds/new">
              <button className="inline-flex items-center gap-2 rounded-full bg-ship px-8 py-3 text-sm font-medium text-background hover:bg-ship/90 transition-all">
                <Plus className="h-4 w-4" /> Start a Build
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {season && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Season ends in {seasonEnd}d</span>
              </div>
            )}

            <div className="grid gap-4">
              {buildsWithStreaks.map(({ build, streak, loggedToday }) => {
                const daysSinceCreated = Math.ceil(
                  (Date.now() - new Date(build.created_at).getTime()) / 86400000
                )
                return (
                  <Link
                    key={build.id}
                    href={`/builds/${build.id}`}
                    className="group block rounded-xl border border-border bg-card p-5 hover:border-ship/30 hover:bg-card/80 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border group-hover:border-ship/20 transition-colors">
                        <Folder className="h-5 w-5 text-muted-foreground group-hover:text-ship transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{build.title}</h3>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {build.category}
                          </span>
                          {!loggedToday && (
                            <span className="shrink-0 flex items-center gap-1 text-xs text-amber">
                              <AlertTriangle className="h-3 w-3" /> Log today
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-amber" : "text-muted-foreground"}`} />
                            {streak} {streak === 1 ? "day" : "days"}
                          </span>
                          <span>Day {daysSinceCreated}</span>
                          {loggedToday && (
                            <span className="flex items-center gap-1 text-ship">
                              <Check className="h-3.5 w-3.5" /> Logged today
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="flex justify-center">
              <Link href="/builds/new">
                <button className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
                  <Plus className="h-4 w-4" /> New Build
                </button>
              </Link>
            </div>

            {pastBuilds.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Past builds ({pastBuilds.length})
                </h3>
                <div className="space-y-2">
                  {pastBuilds.slice(0, 3).map((build) => (
                    <Link
                      key={build.id}
                      href={`/builds/${build.id}`}
                      className="block rounded-lg border border-border bg-card p-3 hover:border-muted-foreground/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{build.title}</span>
                        <span className="text-xs text-ship">Shipped</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {build.category}
                        {build.shipped_at ? ` · ${new Date(build.shipped_at).toLocaleDateString()}` : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {cohort.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {cohort.length} builder{cohort.length !== 1 ? "s" : ""} in your season
                </h3>
                <div className="space-y-2">
                  {cohort.map((c, i) => (
                    <Link
                      key={i}
                      href={`/profile/${c.id}`}
                      className="block rounded-lg border border-border bg-card px-4 py-3 hover:border-muted-foreground/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">—</span>
                        <span className="text-sm text-muted-foreground truncate">{c.build_title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
