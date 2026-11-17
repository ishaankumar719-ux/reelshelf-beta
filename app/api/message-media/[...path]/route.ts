import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseEnv } from "@/lib/supabase/config"
import { MEDIA_BUCKET } from "@/lib/messaging/api"

// Serves a photo, video or video thumbnail from the private message-media
// bucket with the VIEWER's own session. Storage's read policy checks current
// active membership of the conversation on every request (including each
// Range request while a video plays), so someone who left or was removed gets
// a 404 even if they kept the link. Nothing is cached outside the browser.

const SAFE_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/
const PASS_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]

async function serve(request: NextRequest, params: Promise<{ path: string[] }>, method: "GET" | "HEAD") {
  const { path } = await params
  if (path.length !== 3 || !path.every((p) => SAFE_SEGMENT.test(p) && !p.includes(".."))) {
    return new Response(null, { status: 404 })
  }

  const supabase = await createClient()
  if (!supabase) return new Response(null, { status: 503 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(null, { status: 401 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return new Response(null, { status: 401 })

  const { url, publishableKey } = getSupabaseEnv()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: publishableKey,
  }
  const range = request.headers.get("range")
  if (range) headers.Range = range

  const upstream = await fetch(
    `${url.replace(/\/$/, "")}/storage/v1/object/authenticated/${MEDIA_BUCKET}/${path.map(encodeURIComponent).join("/")}`,
    { method, headers, cache: "no-store" },
  )
  if (!upstream.ok && upstream.status !== 206) {
    // Not a member, not uploaded, or gone: never say which.
    return new Response(null, { status: upstream.status === 416 ? 416 : 404 })
  }

  const out = new Headers()
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) out.set(name, value)
  }
  out.set("Cache-Control", "private, no-store")
  out.set("X-Content-Type-Options", "nosniff")
  out.set("Content-Disposition", "inline")
  return new Response(method === "HEAD" ? null : upstream.body, { status: upstream.status, headers: out })
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return serve(request, ctx.params, "GET")
}

export async function HEAD(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return serve(request, ctx.params, "HEAD")
}
