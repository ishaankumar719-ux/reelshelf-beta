"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/AuthProvider"

type Category = "film" | "tv" | "book"

const CAT_META: Record<Category, { label: string; icon: string; color: string }> = {
  film: { label: "Film",  icon: "🎬", color: "rgba(212,175,55,0.9)" },
  tv:   { label: "TV",    icon: "📺", color: "rgba(99,179,237,0.9)" },
  book: { label: "Book",  icon: "📖", color: "rgba(252,129,129,0.9)" },
}

type CategoryStatus = "answered" | "pending"

interface DailyStatus {
  film: CategoryStatus
  tv: CategoryStatus
  book: CategoryStatus
  totalCorrect: number
  longestStreak: number
}

export default function DailyReelCard() {
  const { user } = useAuth()
  const [status, setStatus] = useState<DailyStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    const supabase = createClient()
    if (!supabase) { setLoading(false); return }
    const today = new Date().toISOString().split("T")[0]

    async function load() {
      const [answersRes, progressRes] = await Promise.all([
        supabase!
          .from("trivia_answers")
          .select("category")
          .eq("user_id", user!.id)
          .eq("rotation_date", today),
        supabase!
          .from("trivia_user_progress")
          .select("total_correct, longest_streak")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ])

      const answeredCats = new Set(
        ((answersRes.data ?? []) as { category: string }[]).map(r => r.category)
      )
      const prog = progressRes.data as { total_correct: number; longest_streak: number } | null

      setStatus({
        film: answeredCats.has("film") ? "answered" : "pending",
        tv:   answeredCats.has("tv")   ? "answered" : "pending",
        book: answeredCats.has("book") ? "answered" : "pending",
        totalCorrect:  prog?.total_correct  ?? 0,
        longestStreak: prog?.longest_streak ?? 0,
      })
      setLoading(false)
    }

    load()
  }, [user])

  if (!user || loading) return null

  const allDone = status?.film === "answered" && status?.tv === "answered" && status?.book === "answered"
  const answeredCount = [status?.film, status?.tv, status?.book].filter(s => s === "answered").length

  return (
    <section style={{ marginBottom: 40 }}>
      <Link
        href="/trivia"
        style={{ textDecoration: "none", display: "block" }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 16,
            border: "1px solid rgba(212,175,55,0.18)",
            background: "linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(8,8,16,0.98) 60%, rgba(99,179,237,0.04) 100%)",
            padding: "20px 24px",
            overflow: "hidden",
            cursor: "pointer",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = "rgba(212,175,55,0.35)"
            el.style.boxShadow = "0 0 32px rgba(212,175,55,0.08)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = "rgba(212,175,55,0.18)"
            el.style.boxShadow = "none"
          }}
        >
          {/* Subtle glow orb */}
          <div style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(212,175,55,0.7)" }}>
                  Daily Reel
                </span>
                {allDone ? (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.9)",
                    background: "rgba(212,175,55,0.2)",
                    border: "1px solid rgba(212,175,55,0.35)",
                    borderRadius: 999,
                    padding: "1px 8px",
                  }}>
                    Complete
                  </span>
                ) : (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.35)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 999,
                    padding: "1px 8px",
                    letterSpacing: "0.04em",
                  }}>
                    {answeredCount}/3 done
                  </span>
                )}
              </div>
              <p style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.88)", margin: 0 }}>
                {allDone ? "You completed today's trivia" : "Today's trivia questions"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(212,175,55,0.7)", flexShrink: 0 }}>
              <span style={{ fontSize: 13 }}>→</span>
            </div>
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: status ? 16 : 0 }}>
            {(["film", "tv", "book"] as Category[]).map(cat => {
              const meta = CAT_META[cat]
              const done = status?.[cat] === "answered"
              return (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: 8,
                    border: done
                      ? `1px solid ${meta.color.replace("0.9)", "0.3)")}`
                      : "1px solid rgba(255,255,255,0.08)",
                    background: done
                      ? meta.color.replace("0.9)", "0.08)")
                      : "rgba(255,255,255,0.03)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 12 }}>{meta.icon}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: done ? meta.color : "rgba(255,255,255,0.3)",
                    letterSpacing: "0.02em",
                  }}>
                    {meta.label}
                  </span>
                  {done ? (
                    <span style={{ fontSize: 10, color: meta.color }}>✓</span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Stats footer */}
          {(status?.totalCorrect ?? 0) > 0 || (status?.longestStreak ?? 0) > 0 ? (
            <div style={{
              display: "flex",
              gap: 20,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1 }}>
                  {status?.totalCorrect ?? 0}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 5 }}>correct</span>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(212,175,55,0.85)", lineHeight: 1 }}>
                  {status?.longestStreak ?? 0}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 5 }}>best streak</span>
              </div>
            </div>
          ) : null}
        </div>
      </Link>
    </section>
  )
}
