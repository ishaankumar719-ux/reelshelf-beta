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

const CAT: Record<CategoryKey, { label: string; icon: string; color: string; glow: string; dim: string }> = {
  film: { label: "Film",  icon: "🎬", color: "rgba(212,175,55,0.95)",  glow: "rgba(212,175,55,0.15)", dim: "rgba(212,175,55,0.25)" },
  tv:   { label: "TV",    icon: "📺", color: "rgba(99,179,237,0.95)",  glow: "rgba(99,179,237,0.15)", dim: "rgba(99,179,237,0.25)" },
  book: { label: "Book",  icon: "📖", color: "rgba(252,129,129,0.95)", glow: "rgba(252,129,129,0.15)", dim: "rgba(252,129,129,0.25)" },
}

const DIFF_COLOR = { easy: "rgba(29,200,120,0.75)", medium: "rgba(251,191,36,0.75)", hard: "rgba(239,68,68,0.75)" }
const ANSWER_LETTERS = ["A", "B", "C", "D"]

const CORRECT_BG    = "rgba(29,200,120,0.12)"
const CORRECT_BORD  = "rgba(29,200,120,0.45)"
const CORRECT_TEXT  = "rgba(29,200,120,0.95)"
const WRONG_BG      = "rgba(239,68,68,0.1)"
const WRONG_BORD    = "rgba(239,68,68,0.4)"
const WRONG_TEXT    = "rgba(239,68,68,0.85)"
const DIM_BG        = "rgba(255,255,255,0.01)"
const DIM_BORD      = "rgba(255,255,255,0.05)"
const DIM_TEXT      = "rgba(255,255,255,0.2)"
const IDLE_BG       = "rgba(255,255,255,0.03)"
const IDLE_BORD     = "rgba(255,255,255,0.09)"
const IDLE_TEXT     = "rgba(255,255,255,0.78)"
const SEL_BG        = "rgba(255,255,255,0.07)"
const SEL_BORD      = "rgba(255,255,255,0.3)"
const SEL_TEXT      = "rgba(255,255,255,0.95)"

// ─── Helper components ────────────────────────────────────────────────────────

function StreakPip({ cat, value }: { cat: CategoryKey; value: number }) {
  const c = CAT[cat]
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "5px 10px", borderRadius: 20,
      border: `0.5px solid ${c.dim}`,
      background: c.glow,
    }}>
      <span style={{ fontSize: 13 }}>{c.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: c.color, fontFamily: FONT, letterSpacing: "0.02em" }}>
        {value}
      </span>
    </div>
  )
}

function DifficultyBadge({ level }: { level: "easy" | "medium" | "hard" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      color: DIFF_COLOR[level],
      border: `0.5px solid ${DIFF_COLOR[level]}`,
      borderRadius: 4, padding: "2px 6px",
    }}>
      {level}
    </span>
  )
}

function XPBadge({ amount, animate }: { amount: number; animate: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 20,
      background: "rgba(29,200,120,0.12)",
      border: "0.5px solid rgba(29,200,120,0.35)",
      opacity: animate ? 1 : 0,
      transform: animate ? "translateY(0)" : "translateY(4px)",
      transition: "all 0.4s ease",
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(29,200,120,0.9)", fontFamily: FONT }}>
        +{amount} XP
      </span>
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
          filmStreak:    data.updatedProgress.filmStreak   ?? prev.filmStreak,
          tvStreak:      data.updatedProgress.tvStreak     ?? prev.tvStreak,
          bookStreak:    data.updatedProgress.bookStreak   ?? prev.bookStreak,
          filmCorrect:   data.updatedProgress.filmCorrect  ?? prev.filmCorrect,
          tvCorrect:     data.updatedProgress.tvCorrect    ?? prev.tvCorrect,
          bookCorrect:   data.updatedProgress.bookCorrect  ?? prev.bookCorrect,
          totalCorrect:  data.updatedProgress.totalCorrect ?? prev.totalCorrect,
          longestStreak: data.updatedProgress.longestStreak ?? prev.longestStreak,
        } : {
          filmStreak: data.updatedProgress.filmStreak ?? 0,
          tvStreak: data.updatedProgress.tvStreak ?? 0,
          bookStreak: data.updatedProgress.bookStreak ?? 0,
          filmCorrect: data.updatedProgress.filmCorrect ?? 0,
          tvCorrect: data.updatedProgress.tvCorrect ?? 0,
          bookCorrect: data.updatedProgress.bookCorrect ?? 0,
          totalCorrect: data.updatedProgress.totalCorrect ?? 0,
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
        return { background: SEL_BG, border: `1px solid ${SEL_BORD}`, color: SEL_TEXT, opacity: 0.7, cursor: "wait" }
      }
      return {
        background: hovered ? "rgba(255,255,255,0.06)" : IDLE_BG,
        border: hovered ? `0.5px solid rgba(255,255,255,0.18)` : `0.5px solid ${IDLE_BORD}`,
        color: hovered ? "rgba(255,255,255,0.9)" : IDLE_TEXT,
        cursor: submitting ? "wait" : "pointer",
        transform: hovered ? "translateX(2px)" : "none",
      }
    }

    // Revealed state
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

    if (!revealed || !rd) return { symbol: ANSWER_LETTERS[idx], color: "rgba(255,255,255,0.3)" }
    if (idx === rd.correctIndex) return { symbol: "✓", color: CORRECT_TEXT }
    if (selected && !rd.isCorrect) return { symbol: "✗", color: WRONG_TEXT }
    return { symbol: ANSWER_LETTERS[idx], color: DIM_TEXT }
  }

  function getTabStatus(cat: CategoryKey): "correct" | "wrong" | "none" {
    const state = catStates[cat]
    if (!state.revealed || !state.revealData) return "none"
    return state.revealData.isCorrect ? "correct" : "wrong"
  }

  const streaks = {
    film: progress?.filmStreak ?? 0,
    tv:   progress?.tvStreak   ?? 0,
    book: progress?.bookStreak ?? 0,
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "rgba(255,255,255,0.85)", fontFamily: FONT }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trivia-answer-btn { transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease, transform 0.1s ease; }
        .trivia-tab { transition: all 0.15s ease; }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.95)" }}>
              Trivia
            </h1>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
              {today}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.01em" }}>
            Daily questions across Film, TV &amp; Books. New questions at midnight.
          </p>
        </div>

        {/* ── Streak row ── */}
        {(streaks.film > 0 || streaks.tv > 0 || streaks.book > 0) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" as const }}>
            {streaks.film > 0 && <StreakPip cat="film" value={streaks.film} />}
            {streaks.tv   > 0 && <StreakPip cat="tv"   value={streaks.tv} />}
            {streaks.book > 0 && <StreakPip cat="book" value={streaks.book} />}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                Longest
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>
                {progress?.longestStreak ?? 0}
              </span>
            </div>
          </div>
        )}

        {/* ── Category tabs ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["film", "tv", "book"] as CategoryKey[]).map(cat => {
            const c = CAT[cat]
            const active = cat === activeCategory
            const status = getTabStatus(cat)
            return (
              <button
                key={cat}
                className="trivia-tab"
                onClick={() => setActiveCategory(cat)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: active ? `1px solid ${c.dim}` : "0.5px solid rgba(255,255,255,0.08)",
                  background: active ? c.glow : "rgba(255,255,255,0.02)",
                  color: active ? c.color : "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ letterSpacing: "0.02em" }}>{c.label}</span>
                {status !== "none" && (
                  <span style={{ fontSize: 10, color: status === "correct" ? CORRECT_TEXT : WRONG_TEXT, fontWeight: 800 }}>
                    {status === "correct" ? "✓" : "✗"}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Question card ── */}
        {activeQ ? (
          <div
            style={{
              borderRadius: 16,
              border: `0.5px solid ${activeCat.dim}`,
              background: `radial-gradient(ellipse at 10% 0%, ${activeCat.glow}, rgba(7,7,14,0.98))`,
              overflow: "hidden",
              marginBottom: 24,
            }}
          >
            {/* Card header */}
            <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: activeCat.color }}>
                {activeCat.label}
              </span>
              <DifficultyBadge level={activeQ.difficulty} />
              {activeQ.media_ref && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>
                  {activeQ.media_ref}
                </span>
              )}
            </div>

            {/* Question text */}
            <div style={{ padding: "16px 20px 20px" }}>
              <p style={{
                margin: "0 0 20px",
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.45,
                letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.95)",
              }}>
                {activeQ.question}
              </p>

              {/* Answer options */}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {activeQ.answers.map((answer, idx) => {
                  const { symbol, color } = getAnswerPrefix(idx)
                  const style = getAnswerStyle(idx)

                  return (
                    <button
                      key={idx}
                      className="trivia-answer-btn"
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
                        width: 22, height: 22, flexShrink: 0,
                        borderRadius: "50%",
                        border: `1px solid ${color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color,
                        transition: "all 0.2s ease",
                      }}>
                        {symbol}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, flex: 1, textAlign: "left" as const }}>
                        {answer}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Reveal panel */}
              {activeState.revealed && activeState.revealData && (
                <div style={{
                  marginTop: 20,
                  animation: "fadeSlideUp 0.35s ease both",
                }}>
                  {/* Result banner */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: activeState.revealData.isCorrect ? CORRECT_BG : WRONG_BG,
                    border: `0.5px solid ${activeState.revealData.isCorrect ? CORRECT_BORD : WRONG_BORD}`,
                    marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 16 }}>
                      {activeState.revealData.isCorrect ? "✓" : "✗"}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: activeState.revealData.isCorrect ? CORRECT_TEXT : WRONG_TEXT,
                    }}>
                      {activeState.revealData.isCorrect ? "Correct!" : "Not quite."}
                    </span>
                    <div style={{ marginLeft: "auto" }}>
                      <XPBadge amount={activeState.revealData.xpEarned} animate={activeState.revealData.xpEarned > 0} />
                    </div>
                  </div>

                  {/* Explanation */}
                  {activeState.revealData.explanation && (
                    <div style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.025)",
                      border: "0.5px solid rgba(255,255,255,0.07)",
                      marginBottom: 12,
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,0.5)",
                        fontStyle: "italic",
                      }}>
                        {activeState.revealData.explanation}
                      </p>
                    </div>
                  )}

                  {/* Community stat */}
                  {activeState.revealData.communityStats && (
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.22)", textAlign: "center" as const }}>
                      {activeState.revealData.communityStats.percentCorrect}% of players got this right
                      {" · "}
                      {activeState.revealData.communityStats.totalAnswers.toLocaleString()} {activeState.revealData.communityStats.totalAnswers === 1 ? "answer" : "answers"}
                    </p>
                  )}

                  {/* New badges earned */}
                  {activeState.revealData.newBadges.length > 0 && (
                    <div style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(251,191,36,0.07)",
                      border: "0.5px solid rgba(251,191,36,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span style={{ fontSize: 14 }}>🏅</span>
                      <span style={{ fontSize: 12, color: "rgba(251,191,36,0.9)", fontWeight: 600 }}>
                        Badge unlocked: {activeState.revealData.newBadges.join(", ").replace(/trivia_/g, "").replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            padding: "40px 24px",
            borderRadius: 16,
            border: "0.5px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
            textAlign: "center" as const,
            marginBottom: 24,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              No {activeCat.label.toLowerCase()} question available today.
            </p>
          </div>
        )}

        {/* ── Next category prompt ── */}
        {activeState.revealed && !allAnswered && (
          <div style={{ marginBottom: 24 }}>
            {(["film", "tv", "book"] as CategoryKey[]).filter(c => !catStates[c].revealed && questions[c]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  width: "100%",
                  padding: "13px 18px",
                  borderRadius: 12,
                  border: `0.5px solid ${CAT[cat].dim}`,
                  background: CAT[cat].glow,
                  color: CAT[cat].color,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: FONT,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "opacity 0.15s ease",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 15 }}>{CAT[cat].icon}</span>
                <span>Answer today's {CAT[cat].label} question</span>
                <span style={{ marginLeft: "auto", opacity: 0.6 }}>→</span>
              </button>
            ))}
          </div>
        )}

        {/* ── All done state ── */}
        {allAnswered && (
          <div style={{
            padding: "24px",
            borderRadius: 16,
            border: "0.5px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.025)",
            marginBottom: 24,
            animation: "fadeSlideUp 0.4s ease both",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: "-0.01em" }}>
              All done for today
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {todayXP > 0 ? `You earned ${todayXP} XP today. ` : ""}
              Come back tomorrow for new questions.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              {(["film", "tv", "book"] as CategoryKey[]).map(cat => {
                const rd = catStates[cat].revealData
                return rd ? (
                  <div key={cat} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 20,
                    background: rd.isCorrect ? CORRECT_BG : WRONG_BG,
                    border: `0.5px solid ${rd.isCorrect ? CORRECT_BORD : WRONG_BORD}`,
                  }}>
                    <span style={{ fontSize: 11 }}>{CAT[cat].icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: rd.isCorrect ? CORRECT_TEXT : WRONG_TEXT }}>
                      {rd.isCorrect ? "Correct" : "Wrong"}
                    </span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}

        {/* ── Progress stats ── */}
        {progress && (progress.totalCorrect > 0 || progress.longestStreak > 0) && (
          <div style={{
            padding: "20px",
            borderRadius: 14,
            border: "0.5px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.018)",
          }}>
            <p style={{ margin: "0 0 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.25)" }}>
              Your Progress
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Film correct",  value: progress.filmCorrect,   cat: "film" as CategoryKey },
                { label: "TV correct",    value: progress.tvCorrect,     cat: "tv"   as CategoryKey },
                { label: "Book correct",  value: progress.bookCorrect,   cat: "book" as CategoryKey },
              ].map(({ label, value, cat }) => (
                <div key={cat} style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: CAT[cat].color, letterSpacing: "-0.03em" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", marginTop: 14, paddingTop: 14, display: "flex", gap: 24 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.75)", letterSpacing: "-0.02em" }}>
                  {progress.totalCorrect}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>Total correct</div>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.75)", letterSpacing: "-0.02em" }}>
                  {progress.longestStreak}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>Longest streak</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Back link ── */}
        <div style={{ marginTop: 32, textAlign: "center" as const }}>
          <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>
            ← Back to ReelShelf
          </Link>
        </div>

      </div>
    </div>
  )
}
