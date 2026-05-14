"use client"

import { useState } from "react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriviaQuestion = {
  id: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  question: string
  answers: string[]
  correct_index: number
  explanation: string | null
  media_ref: string | null
}

export type TriviaAnswerRecord = {
  selectedIndex: number
  isCorrect: boolean
  xpEarned: number
}

export type TriviaProgress = {
  filmStreak: number
  tvStreak: number
  bookStreak: number
  filmCorrect: number
  tvCorrect: number
  bookCorrect: number
  totalCorrect: number
  longestStreak: number
}

export type CommunityStat = { totalAnswers: number; percentCorrect: number } | null

type CategoryKey = "film" | "tv" | "book"

type RevealData = {
  isCorrect: boolean
  correctIndex: number
  xpEarned: number
  explanation: string | null
  communityStats: CommunityStat
  newBadges: string[]
}

type CategoryState = {
  revealed: boolean
  selectedIndex: number | null
  revealData: RevealData | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'

const CAT: Record<CategoryKey, {
  label: string; icon: string; color: string; glow: string; dim: string
  gradFrom: string; gradTo: string
}> = {
  film: {
    label: "Film", icon: "🎬",
    color: "rgba(212,175,55,0.95)", glow: "rgba(212,175,55,0.10)", dim: "rgba(212,175,55,0.28)",
    gradFrom: "rgba(212,175,55,0.12)", gradTo: "rgba(212,175,55,0.02)",
  },
  tv: {
    label: "TV", icon: "📺",
    color: "rgba(99,179,237,0.95)", glow: "rgba(99,179,237,0.10)", dim: "rgba(99,179,237,0.28)",
    gradFrom: "rgba(99,179,237,0.12)", gradTo: "rgba(99,179,237,0.02)",
  },
  book: {
    label: "Book", icon: "📖",
    color: "rgba(252,129,129,0.95)", glow: "rgba(252,129,129,0.10)", dim: "rgba(252,129,129,0.28)",
    gradFrom: "rgba(252,129,129,0.12)", gradTo: "rgba(252,129,129,0.02)",
  },
}

const DIFF_COLOR = {
  easy:   "rgba(29,200,120,0.75)",
  medium: "rgba(251,191,36,0.75)",
  hard:   "rgba(239,68,68,0.75)",
}
const ANSWER_LETTERS = ["A", "B", "C", "D"]

const CORRECT_BG   = "rgba(29,200,120,0.10)"
const CORRECT_BORD = "rgba(29,200,120,0.40)"
const CORRECT_TEXT = "rgba(29,200,120,0.95)"
const WRONG_BG     = "rgba(239,68,68,0.09)"
const WRONG_BORD   = "rgba(239,68,68,0.38)"
const WRONG_TEXT   = "rgba(239,68,68,0.85)"
const DIM_BG       = "rgba(255,255,255,0.01)"
const DIM_BORD     = "rgba(255,255,255,0.05)"
const DIM_TEXT     = "rgba(255,255,255,0.18)"

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
}

function getTierLabel(totalCorrect: number): string {
  if (totalCorrect >= 100) return "Scholar"
  if (totalCorrect >= 50)  return "Historian"
  if (totalCorrect >= 20)  return "Critic"
  if (totalCorrect >= 5)   return "Enthusiast"
  return "Newcomer"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: "easy" | "medium" | "hard" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      color: DIFF_COLOR[level],
      border: `0.5px solid ${DIFF_COLOR[level]}`,
      borderRadius: 4, padding: "2px 7px",
    }}>
      {level}
    </span>
  )
}

function StatPill({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div style={{ textAlign: "center" as const }}>
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1,
        color: color ?? "rgba(255,255,255,0.85)",
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginTop: 3, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
        {label}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TriviaHubProps {
  today: string
  questions: Record<CategoryKey, TriviaQuestion | null>
  initialAnswers: Record<CategoryKey, TriviaAnswerRecord | null>
  initialProgress: TriviaProgress | null
  initialCommunityStats: Record<CategoryKey, CommunityStat>
}

export default function TriviaHub({
  today,
  questions,
  initialAnswers,
  initialProgress,
  initialCommunityStats,
}: TriviaHubProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(() => {
    for (const cat of (["film", "tv", "book"] as CategoryKey[])) {
      if (!initialAnswers[cat]) return cat
    }
    return "film"
  })

  const [catStates, setCatStates] = useState<Record<CategoryKey, CategoryState>>(() => {
    const init: Record<CategoryKey, CategoryState> = {
      film: { revealed: false, selectedIndex: null, revealData: null },
      tv:   { revealed: false, selectedIndex: null, revealData: null },
      book: { revealed: false, selectedIndex: null, revealData: null },
    }
    for (const cat of (["film", "tv", "book"] as CategoryKey[])) {
      const ia = initialAnswers[cat]
      const q = questions[cat]
      if (ia && q) {
        init[cat] = {
          revealed: true,
          selectedIndex: ia.selectedIndex,
          revealData: {
            isCorrect: ia.isCorrect,
            correctIndex: q.correct_index,
            xpEarned: ia.xpEarned,
            explanation: q.explanation,
            communityStats: initialCommunityStats[cat],
            newBadges: [],
          },
        }
      }
    }
    return init
  })

  const [progress, setProgress] = useState<TriviaProgress | null>(initialProgress)
  const [submitting, setSubmitting] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const activeCat = CAT[activeCategory]
  const activeQ = questions[activeCategory]
  const activeState = catStates[activeCategory]

  const allAnswered = (["film", "tv", "book"] as CategoryKey[]).every(c => catStates[c].revealed)
  const todayXP = (["film", "tv", "book"] as CategoryKey[]).reduce((sum, c) => {
    return sum + (catStates[c].revealData?.xpEarned ?? 0)
  }, 0)
  const todayCorrect = (["film", "tv", "book"] as CategoryKey[]).filter(c => catStates[c].revealData?.isCorrect).length

  async function handleSelect(idx: number) {
    if (!activeQ || activeState.revealed || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/trivia/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeQ.id,
          rotationDate: today,
          category: activeCategory,
          selectedIndex: idx,
        }),
      })

      const data = await res.json() as {
        isCorrect: boolean
        correctIndex: number
        xpEarned: number
        explanation: string | null
        communityStats: CommunityStat
        updatedProgress: Record<string, number>
        newBadges: string[]
        error?: string
      }

      if (!res.ok) {
        console.error("Trivia answer error:", data.error)
        return
      }

      setCatStates(prev => ({
        ...prev,
        [activeCategory]: {
          revealed: true,
          selectedIndex: idx,
          revealData: {
            isCorrect: data.isCorrect,
            correctIndex: data.correctIndex,
            xpEarned: data.xpEarned,
            explanation: data.explanation,
            communityStats: data.communityStats,
            newBadges: data.newBadges,
          },
        },
      }))

      if (data.updatedProgress) {
        setProgress(prev => prev ? {
          ...prev,
          filmStreak:    data.updatedProgress.filmStreak    ?? prev.filmStreak,
          tvStreak:      data.updatedProgress.tvStreak      ?? prev.tvStreak,
          bookStreak:    data.updatedProgress.bookStreak    ?? prev.bookStreak,
          filmCorrect:   data.updatedProgress.filmCorrect   ?? prev.filmCorrect,
          tvCorrect:     data.updatedProgress.tvCorrect     ?? prev.tvCorrect,
          bookCorrect:   data.updatedProgress.bookCorrect   ?? prev.bookCorrect,
          totalCorrect:  data.updatedProgress.totalCorrect  ?? prev.totalCorrect,
          longestStreak: data.updatedProgress.longestStreak ?? prev.longestStreak,
        } : {
          filmStreak:    data.updatedProgress.filmStreak    ?? 0,
          tvStreak:      data.updatedProgress.tvStreak      ?? 0,
          bookStreak:    data.updatedProgress.bookStreak    ?? 0,
          filmCorrect:   data.updatedProgress.filmCorrect   ?? 0,
          tvCorrect:     data.updatedProgress.tvCorrect     ?? 0,
          bookCorrect:   data.updatedProgress.bookCorrect   ?? 0,
          totalCorrect:  data.updatedProgress.totalCorrect  ?? 0,
          longestStreak: data.updatedProgress.longestStreak ?? 0,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  function getAnswerStyle(idx: number): React.CSSProperties {
    const revealed = activeState.revealed
    const rd = activeState.revealData
    const selected = activeState.selectedIndex === idx

    if (!revealed) {
      const hovered = hoveredIdx === idx && !submitting
      if (selected && submitting) {
        return {
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.85)",
          opacity: 0.6,
          cursor: "wait",
        }
      }
      return {
        background: hovered ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)",
        border: hovered ? "0.5px solid rgba(255,255,255,0.16)" : "0.5px solid rgba(255,255,255,0.08)",
        color: hovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.72)",
        cursor: submitting ? "wait" : "pointer",
        transform: hovered ? "translateX(3px)" : "none",
      }
    }

    if (!rd) return { background: DIM_BG, border: `0.5px solid ${DIM_BORD}`, color: DIM_TEXT }
    if (idx === rd.correctIndex) {
      return { background: CORRECT_BG, border: `1px solid ${CORRECT_BORD}`, color: CORRECT_TEXT }
    }
    if (selected && !rd.isCorrect) {
      return { background: WRONG_BG, border: `1px solid ${WRONG_BORD}`, color: WRONG_TEXT }
    }
    return { background: DIM_BG, border: `0.5px solid ${DIM_BORD}`, color: DIM_TEXT }
  }

  function getAnswerPrefix(idx: number): { symbol: string; color: string } {
    const revealed = activeState.revealed
    const rd = activeState.revealData
    const selected = activeState.selectedIndex === idx

    if (!revealed || !rd) return { symbol: ANSWER_LETTERS[idx], color: "rgba(255,255,255,0.28)" }
    if (idx === rd.correctIndex) return { symbol: "✓", color: CORRECT_TEXT }
    if (selected && !rd.isCorrect) return { symbol: "✗", color: WRONG_TEXT }
    return { symbol: ANSWER_LETTERS[idx], color: DIM_TEXT }
  }

  function getTabStatus(cat: CategoryKey): "correct" | "wrong" | "unanswered" {
    const state = catStates[cat]
    if (!state.revealed || !state.revealData) return "unanswered"
    return state.revealData.isCorrect ? "correct" : "wrong"
  }

  const streaks = {
    film: progress?.filmStreak ?? 0,
    tv:   progress?.tvStreak   ?? 0,
    book: progress?.bookStreak ?? 0,
  }
  const totalCorrect  = progress?.totalCorrect  ?? 0
  const longestStreak = progress?.longestStreak ?? 0

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "rgba(255,255,255,0.85)", fontFamily: FONT }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes xpPop {
          0%   { opacity: 0; transform: scale(0.85) translateY(4px); }
          60%  { transform: scale(1.06) translateY(-1px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .tr-answer { transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.12s ease, opacity 0.15s ease; }
        .tr-tab    { transition: all 0.18s ease; }
        .tr-cat-card { transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease; }
      `}</style>

      {/* ── Cinematic hero ── */}
      <div style={{
        position: "relative",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        background: "linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(7,7,14,0) 100%)",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 70% 140% at 50% -10%, rgba(212,175,55,0.07) 0%, transparent 70%)`,
        }} />

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px 28px", position: "relative" }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(212,175,55,0.65)",
            }}>
              Daily Reel
            </span>
            <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.02em" }}>
              {formatDate(today)}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            margin: "0 0 6px",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "rgba(255,255,255,0.96)",
            lineHeight: 1.1,
          }}>
            {allAnswered ? "Today's screening complete." : "What do you know?"}
          </h1>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.32)",
            lineHeight: 1.5,
            maxWidth: 420,
          }}>
            {allAnswered
              ? `You earned ${todayXP} XP and got ${todayCorrect}/3 correct. New questions at midnight.`
              : "Three daily questions — Film, TV, and Books. Answer them all."}
          </p>

          {/* Stats bar */}
          {(totalCorrect > 0 || longestStreak > 0) && (
            <div style={{
              display: "flex",
              gap: 28,
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <StatPill value={totalCorrect} label="Correct" color="rgba(255,255,255,0.8)" />
              <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />
              <StatPill value={longestStreak} label="Best Streak" color="rgba(212,175,55,0.85)" />
              <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />
              <StatPill value={getTierLabel(totalCorrect)} label="Rank" color="rgba(255,255,255,0.55)" />

              {/* Per-category current streaks */}
              {(streaks.film > 0 || streaks.tv > 0 || streaks.book > 0) && (
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  {(["film", "tv", "book"] as CategoryKey[]).map(cat => (
                    streaks[cat] > 0 ? (
                      <div key={cat} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 20,
                        border: `0.5px solid ${CAT[cat].dim}`,
                        background: CAT[cat].glow,
                        fontSize: 11, fontWeight: 700,
                        color: CAT[cat].color,
                      }}>
                        <span>{CAT[cat].icon}</span>
                        <span>{streaks[cat]}</span>
                      </div>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 100px" }}>

        {/* ── Category selector ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 28,
        }}>
          {(["film", "tv", "book"] as CategoryKey[]).map(cat => {
            const c = CAT[cat]
            const active = cat === activeCategory
            const status = getTabStatus(cat)
            const isAnswered = status !== "unanswered"

            return (
              <button
                key={cat}
                className="tr-cat-card"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: active ? `1px solid ${c.dim}` : isAnswered ? `0.5px solid rgba(255,255,255,0.09)` : "0.5px solid rgba(255,255,255,0.07)",
                  background: active
                    ? `linear-gradient(135deg, ${c.gradFrom} 0%, ${c.gradTo} 100%)`
                    : isAnswered ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.018)",
                  boxShadow: active ? `0 4px 24px ${c.glow}` : "none",
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: active ? c.color : isAnswered ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.3)",
                }}>
                  {c.label}
                </span>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                  background: isAnswered
                    ? (status === "correct" ? CORRECT_BG : WRONG_BG)
                    : "rgba(255,255,255,0.04)",
                  border: isAnswered
                    ? `0.5px solid ${status === "correct" ? CORRECT_BORD : WRONG_BORD}`
                    : "0.5px solid rgba(255,255,255,0.09)",
                  color: isAnswered
                    ? (status === "correct" ? CORRECT_TEXT : WRONG_TEXT)
                    : "rgba(255,255,255,0.2)",
                }}>
                  {isAnswered ? (status === "correct" ? "✓" : "✗") : "·"}
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Question card ── */}
        {activeQ ? (
          <div
            key={activeCategory}
            style={{
              borderRadius: 16,
              border: `0.5px solid ${activeCat.dim}`,
              background: `radial-gradient(ellipse 120% 80% at 0% 0%, ${activeCat.gradFrom} 0%, rgba(7,7,14,0.99) 60%)`,
              overflow: "hidden",
              marginBottom: 20,
              animation: "fadeUp 0.25s ease both",
            }}
          >
            {/* Card meta */}
            <div style={{
              padding: "16px 20px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: activeCat.color,
              }}>
                {activeCat.label}
              </span>
              <DifficultyBadge level={activeQ.difficulty} />
              {activeQ.media_ref && (
                <span style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.2)",
                  fontStyle: "italic",
                  maxWidth: 180,
                  textAlign: "right" as const,
                  lineHeight: 1.3,
                }}>
                  {activeQ.media_ref}
                </span>
              )}
            </div>

            {/* Question + answers */}
            <div style={{ padding: "18px 20px 20px" }}>
              <p style={{
                margin: "0 0 20px",
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.5,
                letterSpacing: "-0.022em",
                color: "rgba(255,255,255,0.96)",
              }}>
                {activeQ.question}
              </p>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {activeQ.answers.map((answer, idx) => {
                  const { symbol, color } = getAnswerPrefix(idx)
                  const style = getAnswerStyle(idx)

                  return (
                    <button
                      key={idx}
                      className="tr-answer"
                      onClick={() => { if (!activeState.revealed && !submitting) void handleSelect(idx) }}
                      onMouseEnter={() => !activeState.revealed && setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      disabled={activeState.revealed || submitting}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        borderRadius: 10,
                        textAlign: "left" as const,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        fontFamily: FONT,
                        ...style,
                      }}
                    >
                      <span style={{
                        width: 24, height: 24, flexShrink: 0,
                        borderRadius: "50%",
                        border: `1px solid ${color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color,
                        transition: "all 0.15s ease",
                      }}>
                        {symbol}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, flex: 1 }}>
                        {answer}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* ── Reveal panel ── */}
              {activeState.revealed && activeState.revealData && (
                <div style={{ marginTop: 22, animation: "fadeUp 0.3s ease both" }}>

                  {/* Result banner */}
                  <div style={{
                    padding: "14px 18px",
                    borderRadius: 12,
                    background: activeState.revealData.isCorrect ? CORRECT_BG : WRONG_BG,
                    border: `1px solid ${activeState.revealData.isCorrect ? CORRECT_BORD : WRONG_BORD}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 18 }}>
                      {activeState.revealData.isCorrect ? "✓" : "✗"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: activeState.revealData.isCorrect ? CORRECT_TEXT : WRONG_TEXT,
                        marginBottom: 1,
                      }}>
                        {activeState.revealData.isCorrect ? "Correct." : "Not quite."}
                      </div>
                      {activeState.revealData.communityStats && (
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          {activeState.revealData.communityStats.percentCorrect}% of players got this right
                          {" · "}
                          {activeState.revealData.communityStats.totalAnswers.toLocaleString()} answers
                        </div>
                      )}
                    </div>
                    {activeState.revealData.xpEarned > 0 && (
                      <div style={{
                        padding: "4px 11px",
                        borderRadius: 999,
                        background: "rgba(29,200,120,0.12)",
                        border: "0.5px solid rgba(29,200,120,0.32)",
                        fontSize: 11, fontWeight: 800,
                        color: "rgba(29,200,120,0.9)",
                        animation: "xpPop 0.4s ease both",
                        flexShrink: 0,
                      }}>
                        +{activeState.revealData.xpEarned} XP
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  {activeState.revealData.explanation && (
                    <div style={{
                      padding: "13px 16px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.022)",
                      border: "0.5px solid rgba(255,255,255,0.06)",
                      marginBottom: 12,
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: 12, lineHeight: 1.65,
                        color: "rgba(255,255,255,0.45)",
                        fontStyle: "italic",
                      }}>
                        {activeState.revealData.explanation}
                      </p>
                    </div>
                  )}

                  {/* Badge notification */}
                  {activeState.revealData.newBadges.length > 0 && (
                    <div style={{
                      padding: "11px 14px",
                      borderRadius: 10,
                      background: "rgba(251,191,36,0.06)",
                      border: "0.5px solid rgba(251,191,36,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 12,
                    }}>
                      <span style={{ fontSize: 16 }}>🏅</span>
                      <span style={{ fontSize: 12, color: "rgba(251,191,36,0.9)", fontWeight: 600 }}>
                        Badge unlocked:{" "}
                        {activeState.revealData.newBadges
                          .map(s => s.replace(/^trivia_/, "").replace(/_/g, " "))
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Next category prompt */}
                  {!allAnswered && (
                    <div style={{ marginTop: 16 }}>
                      {(["film", "tv", "book"] as CategoryKey[]).filter(c => !catStates[c].revealed && questions[c]).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          style={{
                            width: "100%",
                            padding: "13px 18px",
                            borderRadius: 10,
                            border: `0.5px solid ${CAT[cat].dim}`,
                            background: CAT[cat].glow,
                            color: CAT[cat].color,
                            fontSize: 13, fontWeight: 700,
                            fontFamily: FONT,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                            transition: "opacity 0.15s ease",
                          }}
                        >
                          <span style={{ fontSize: 15 }}>{CAT[cat].icon}</span>
                          <span>Answer today's {CAT[cat].label} question</span>
                          <span style={{ marginLeft: "auto", opacity: 0.5 }}>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            padding: "44px 24px",
            borderRadius: 16,
            border: "0.5px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
            textAlign: "center" as const,
            marginBottom: 20,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
              No {activeCat.label.toLowerCase()} question available today.
            </p>
          </div>
        )}

        {/* ── All done summary ── */}
        {allAnswered && (
          <div style={{
            padding: "22px 24px",
            borderRadius: 16,
            border: "0.5px solid rgba(212,175,55,0.15)",
            background: "linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(8,8,16,0.98) 100%)",
            marginBottom: 28,
            animation: "fadeUp 0.4s ease both",
          }}>
            <p style={{
              margin: "0 0 4px",
              fontSize: 13, fontWeight: 700,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "-0.01em",
            }}>
              Today's screening complete
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Come back tomorrow for three new questions.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {(["film", "tv", "book"] as CategoryKey[]).map(cat => {
                const rd = catStates[cat].revealData
                if (!rd) return null
                return (
                  <div key={cat} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 11px", borderRadius: 20,
                    background: rd.isCorrect ? CORRECT_BG : WRONG_BG,
                    border: `0.5px solid ${rd.isCorrect ? CORRECT_BORD : WRONG_BORD}`,
                  }}>
                    <span style={{ fontSize: 11 }}>{CAT[cat].icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: rd.isCorrect ? CORRECT_TEXT : WRONG_TEXT }}>
                      {CAT[cat].label}
                    </span>
                    <span style={{ fontSize: 10, color: rd.isCorrect ? CORRECT_TEXT : WRONG_TEXT, opacity: 0.8 }}>
                      {rd.isCorrect ? "✓" : "✗"}
                    </span>
                    {rd.xpEarned > 0 && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        +{rd.xpEarned}
                      </span>
                    )}
                  </div>
                )
              })}
              {todayXP > 0 && (
                <div style={{
                  marginLeft: "auto",
                  fontSize: 13, fontWeight: 800,
                  color: "rgba(29,200,120,0.85)",
                }}>
                  +{todayXP} XP
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Progress stats ── */}
        {progress && (progress.totalCorrect > 0 || progress.longestStreak > 0) && (
          <div style={{
            padding: "20px",
            borderRadius: 14,
            border: "0.5px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.016)",
            marginBottom: 28,
          }}>
            <p style={{
              margin: "0 0 16px",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: "rgba(255,255,255,0.2)",
            }}>
              All-time progress
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {(["film", "tv", "book"] as CategoryKey[]).map(cat => {
                const correctKey = `${cat}Correct` as keyof TriviaProgress
                return (
                  <div key={cat} style={{ textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: CAT[cat].color, letterSpacing: "-0.04em", lineHeight: 1 }}>
                      {progress[correctKey]}
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 3, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      {CAT[cat].label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Weekly Challenge placeholder ── */}
        <div style={{
          padding: "20px 22px",
          borderRadius: 14,
          border: "0.5px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.014)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: 80, height: 80,
            background: "radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(167,139,250,0.55)" }}>
              Coming soon
            </span>
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "-0.01em" }}>
            Weekly Challenges
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.22)", lineHeight: 1.5 }}>
            Themed question sets, leaderboards, and exclusive badges. Every Monday.
          </p>
        </div>

        {/* ── Back link ── */}
        <div style={{ marginTop: 40, textAlign: "center" as const }}>
          <Link href="/" style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textDecoration: "none", letterSpacing: "0.04em" }}>
            ← Back to ReelShelf
          </Link>
        </div>
      </div>
    </div>
  )
}
