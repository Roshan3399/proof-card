"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Nav } from "@/components/nav"
import { ArrowLeft, Compass } from "lucide-react"

export default function SeasonPage() {
  const router = useRouter()
  const supabase = createClient()

  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) router.push("/login")
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <Nav />

      <main className="mx-auto max-w-2xl px-4 py-16 pb-24">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ship/20 to-ocean/20 border border-ship/30">
            <Compass className="h-10 w-10 text-ship" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Seasons — Coming Soon</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
            Seasons are timed competition cycles where builders race to ship their best work. At the end of each season, top builders earn reputation bonuses and a spot on the leaderboard.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-ship animate-pulse" />
            In development — launching soon
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { label: "Leaderboard", desc: "Season rankings" },
              { label: "Prizes", desc: "Reputation bonuses" },
              { label: "Teams", desc: "Build together" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-sm font-medium text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
