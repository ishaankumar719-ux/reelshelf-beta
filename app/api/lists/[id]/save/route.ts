import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { recalculateListScores } from "@/lib/supabase/list-engagement"

export const dynamic = "force-dynamic"

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: listId } = await ctx.params

  const { data: list } = await supabase
    .from("user_lists")
    .select("user_id")
    .eq("id", listId)
    .single()

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (list.user_id === user.id) return NextResponse.json({ error: "Cannot save own list" }, { status: 403 })

  const { error } = await supabase
    .from("list_saves")
    .insert({ list_id: listId, user_id: user.id })

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Already saved" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const counts = await recalculateListScores(supabase, listId)
  return NextResponse.json({ ok: true, ...counts })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: listId } = await ctx.params

  const { error } = await supabase
    .from("list_saves")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = await recalculateListScores(supabase, listId)
  return NextResponse.json({ ok: true, ...counts })
}
