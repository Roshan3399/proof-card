import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: conn } = await supabase
      .from("github_connections")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (conn) {
      await supabase.from("github_commits").delete().in("repo_id",
        supabase.from("github_repos").select("id").eq("user_id", user.id) as any
      )
      await supabase.from("github_repos").delete().eq("user_id", user.id)
      await supabase.from("github_connections").delete().eq("id", conn.id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
