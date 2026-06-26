"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Flame, Check, ShipIcon } from "lucide-react"
import { Nav } from "@/components/nav"
import { calculateStreak } from "@/lib/streak"
import type { Build, Log } from "@/types"

export default function BuildDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()
  const [build, setBuild] = useState<Build | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [shipping, setShipping] = useState(false)
  const [showShipConfirm, setShowShipConfirm] = useState(false)
  const [shipInput, setShipInput] = useState("")
  const [showShipAnimation, setShowShipAnimation] = useState(false)
  const [todaysGoal, setTodaysGoal] = useState("")
  const [loggedToday, setLoggedToday] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubActivity, setGithubActivity] = useState<{
    commits: { sha: string; message: string; url: string; repo: string }[]
    repos: string[]
    languages: string[]
    total_commits: number
  } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: b } = await supabase
        .from("builds")
        .select("*")
        .eq("id", id)
        .single()

      if (!b) { setLoading(false); return }

      setBuild(b as unknown as Build)

      const { data: l } = await supabase
        .from("logs")
        .select("*")
        .eq("build_id", id)
        .order("created_at", { ascending: false })

      if (l) {
        const logList = l as unknown as Log[]
        setLogs(logList)
        const today = new Date().toISOString().split("T")[0]
        const todayLog = logList.find((log) => log.log_date === today || log.created_at?.startsWith(today))
        if (todayLog) setLoggedToday(true)
      }

      const { data: githubConn } = await supabase
        .from("github_connections")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (githubConn) {
        setGithubConnected(true)
        try {
          const today = new Date().toISOString().split("T")[0]
          const res = await fetch(`/api/github/activity?date=${today}`)
          if (res.ok) {
            const data = await res.json()
            setGithubActivity(data)
          }
        } catch {}
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleLogProgress() {
    if (!build || loggedToday || !todaysGoal.trim()) return
    if (todaysGoal.trim().length < 10) {
      setLogError("Log must be at least 10 characters")
      return
    }
    setSaving(true)
    setLogError(null)

    const logPayload: Record<string, any> = {
      build_id: id,
      content: todaysGoal,
    }

    if (githubActivity && githubActivity.total_commits > 0) {
      logPayload.github_verified = true
      logPayload.github_commits_count = githubActivity.total_commits
      logPayload.github_repos_touched = githubActivity.repos
      logPayload.github_languages = githubActivity.languages
    }

    const { data, error } = await supabase.from("logs").insert(logPayload).select().single()
    if (error) {
      setLogError(error.message)
      setSaving(false)
      return
    }
    setLogs((prev) => [data as unknown as Log, ...prev])
    setLoggedToday(true)
    setTodaysGoal("")
    setSaving(false)
  }

  async function handleShip() {
    if (!build || shipInput !== build.title) return

    setShipping(true)
    const { error } = await supabase
      .from("builds")
      .update({ status: "shipped", shipped_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      setShipping(false)
      return
    }

    setBuild({ ...build, status: "shipped", shipped_at: new Date().toISOString() })
    setShowShipConfirm(false)
    setShipping(false)
    setShipInput("")
    setShowShipAnimation(true)
    setTimeout(() => setShowShipAnimation(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ship border-t-transparent" />
      </div>
    )
  }

  if (!build) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Build not found.</p>
          <Link href="/dashboard" className="text-sm text-foreground underline">Back to dashboard</Link>
        </div>
      </div>
    )
  }

  const streak = calculateStreak(logs)
  const canShip = logs.length >= 3

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          {build.status !== "shipped" && (
            <button
              onClick={() => setShowShipConfirm(true)}
              disabled={!canShip}
              className="rounded-lg bg-ship px-4 py-1.5 text-xs font-medium text-background hover:bg-ship/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Ship It
            </button>
          )}
        </div>
      </header>

      <Nav />

      <main className="mx-auto max-w-2xl px-4 py-8 pb-24">
        {build.status === "shipped" && (
          <div className="mb-6 rounded-xl border border-ship/20 bg-ship/10 p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-ship shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">This build has shipped.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Frozen forever as proof of your work.</p>
              </div>
            </div>
            {logs.some((l) => l.github_verified) && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-ship/20 pt-3">
                <span>Verified logs: {logs.filter((l) => l.github_verified).length}/{logs.length}</span>
                <span>Total commits: {logs.reduce((s, l) => s + (l.github_commits_count ?? 0), 0)}</span>
                {[...new Set(logs.flatMap((l) => l.github_languages ?? []))].length > 0 && (
                  <span>Languages: {[...new Set(logs.flatMap((l) => l.github_languages ?? []))].slice(0, 5).join(", ")}</span>
                )}
              </div>
            )}
            <div className="mt-3">
              <Link href={`/api/builds/${id}/proof-card`} target="_blank">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-ship px-3 py-1.5 text-xs font-medium text-ship hover:bg-ship/10 transition-all">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg> View Proof Card
                </button>
              </Link>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{build.title}</h1>
            {build.status === "shipped" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ship/10 px-3 py-0.5 text-xs font-medium text-ship border border-ship/20">
                <Check className="h-3 w-3" /> Shipped
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{build.category}</span>
            <span className="flex items-center gap-1">
              <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-amber" : "text-muted-foreground"}`} />
              {streak} {streak === 1 ? "day" : "days"}
            </span>
            <span className="capitalize">{build.status}</span>
          </div>
          {build.description && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{build.description}</p>
          )}
        </div>

        {build.status !== "shipped" && (
          <div className="mb-8 rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">Today&apos;s goal</label>
              <input
                value={todaysGoal}
                onChange={(e) => setTodaysGoal(e.target.value)}
                placeholder="What will you build today?"
                className="block w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship transition-all"
                disabled={loggedToday}
              />
            </div>
            {logError && <p className="text-xs text-red mb-3">{logError}</p>}
            <button
              onClick={handleLogProgress}
              disabled={loggedToday || saving || !todaysGoal.trim() || todaysGoal.trim().length < 10}
              className="w-full rounded-lg bg-ship px-4 py-3 text-sm font-medium text-background hover:bg-ship/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {loggedToday ? "Logged today" : saving ? "Saving..." : "Log progress"}
            </button>
            {!canShip && logs.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {3 - logs.length} more log{3 - logs.length !== 1 ? "s" : ""} before you can ship
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Daily logs</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet. Start building!</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{log.content}</p>
                  {log.github_verified && (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-ship/10 px-2 py-0.5 text-xs text-ship border border-ship/20">
                      <Check className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(log.created_at).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  {log.github_verified && (
                    <span>
                      {log.github_commits_count} commit{log.github_commits_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {log.github_verified && log.github_repos_touched?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.github_repos_touched.join(", ")}
                    {log.github_languages?.length > 0 && ` · ${log.github_languages.join(", ")}`}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {showShipConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ship/20">
              <ShipIcon className="h-6 w-6 text-ship" />
            </div>
            <h2 className="text-lg font-semibold text-foreground text-center mb-2">Ship this build?</h2>
            <p className="text-sm text-muted-foreground text-center mb-5">
              Once shipped, this Build is frozen forever. Your reputation will increase. No edits, no going back.
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Type <span className="text-foreground font-mono">{build.title}</span> to confirm:
            </p>
            <input
              value={shipInput}
              onChange={(e) => setShipInput(e.target.value)}
              placeholder={build.title}
              className="block w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowShipConfirm(false); setShipInput("") }}
                className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleShip}
                disabled={shipInput !== build.title || shipping}
                className="flex-1 rounded-lg bg-ship px-4 py-3 text-sm font-medium text-background hover:bg-ship/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {shipping ? "Shipping..." : "Ship It"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShipAnimation && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ship/20 animate-pulse">
              <Check className="h-8 w-8 text-ship" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{build.title} has shipped.</h2>
            <p className="text-muted-foreground">This Build is now frozen forever. Your reputation has increased.</p>
            <Link href="/dashboard">
              <button className="mt-6 rounded-lg bg-ship px-6 py-2.5 text-sm font-medium text-background hover:bg-ship/90 transition-all">
                Start your next Build
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
