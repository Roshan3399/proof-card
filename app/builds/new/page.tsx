"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Nav } from "@/components/nav"
import { z } from "zod"

const buildSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(128, "Title too long"),
  description: z.string().max(500).optional(),
  category: z.enum(["code", "design", "writing", "hardware", "ai", "other"]),
})

export default function NewBuildPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string>("code")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login")
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const result = buildSchema.safeParse({ title, description, category })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); setLoading(false); return }

    const { count: activeCount } = await supabase
      .from("builds")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("status", "eq", "shipped")

    if (activeCount && activeCount >= 3) {
      setErrors({ form: "Ship or archive a Build before starting a new one. Maximum 3 active builds." })
      setLoading(false)
      return
    }

    const { count: shippedCount } = await supabase
      .from("builds")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "shipped")

    if (!shippedCount || shippedCount < 2) {
      setErrors({ form: `Ship ${2 - (shippedCount ?? 0)} more build${2 - (shippedCount ?? 0) !== 1 ? "s" : ""} before starting a new one. You need at least 2 shipped builds to unlock new projects.` })
      setLoading(false)
      return
    }

    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle()

    const { error } = await supabase.from("builds").insert({
      user_id: user.id,
      title,
      description,
      category,
      status: "planning",
      season_id: (season as unknown as { id: string })?.id ?? null,
    })

    if (error) {
      setErrors({ form: error.message })
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

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

      <main className="mx-auto max-w-lg px-4 py-10 pb-24">
        <h1 className="text-xl font-semibold text-foreground mb-1">Start a Build</h1>
        <p className="text-sm text-muted-foreground mb-8">What are you building this season?</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground/80 mb-1.5">Title</label>
            <input id="title" type="text" placeholder="e.g. AI Flashcard App" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship transition-all" />
            {errors.title && <p className="mt-1 text-xs text-red">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground/80 mb-1.5">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ship transition-all">
              <option value="code">Code</option>
              <option value="design">Design</option>
              <option value="writing">Writing</option>
              <option value="hardware">Hardware</option>
              <option value="ai">AI</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground/80 mb-1.5">Description (optional)</label>
            <textarea id="description" placeholder="What are you building? Why does it matter?" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ship resize-none transition-all" />
          </div>

          {errors.form && <p className="text-sm text-red">{errors.form}</p>}

          <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-ship px-6 py-3 text-sm font-medium text-background hover:bg-ship/90 disabled:opacity-50 transition-all">
            {loading ? "Creating..." : "Start building"}
          </button>
        </form>
      </main>
    </div>
  )
}
