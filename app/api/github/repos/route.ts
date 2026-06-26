import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: repos, error } = await supabase
      .from("github_repos")
      .select("*")
      .eq("user_id", user.id)
      .order("pushed_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ repos })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
