"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import DailyPickCard from "@/components/home/DailyPickCard"
import DiaryLogModal from "@/components/diary/DiaryLogModal"
import { upsertSavedItemToBackend } from "@/lib/supabase/persistence"
import type { TriviaQuestion, TriviaProgress, TriviaAnswerRecord, CommunityStat } from "@/components/trivia/TriviaHub"
import type { ArticleData, StaffPickData } from "@/components/daily-reel/DailyReelEditorial"
import type { DiaryEntry } from "@/types/diary"

const SANS = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif'
const SERIF = 'Georgia,"Times New Roman",Times,serif'

type Category = "film" | "tv" | "book"

type DailyProgressState = {
  picked: boolean
  question_answered: boolean
  story_read: boolean
  staff_picks_explored: boolean
}

export type HiddenGem = {
  id: string
  title: string
  year: string
  poster: string | null
  overview: string
  creator: string
  media_type: "film" | "tv"
}

type CatAnswerState = {
  revealed: boolean
  selectedIndex: number | null
  isCorrect: boolean | null
  correctIndex: number | null
  explanation: string | null
  xpEarned: number
  communityStats: { totalAnswers: number; percentCorrect: number } | null
  submitting: boolean
}

type RotationRow = {
  rotation_date: string
  film_question_id: string | null
  tv_question_id: string | null
  book_question_id: string | null
}

export type DailyReelPageProps = {
  today: string
  userId: string
  rotation: RotationRow | null
  questions: Record<Category, TriviaQuestion | null>
  initialAnswers: Record<Category, TriviaAnswerRecord | null>
  initialProgress: TriviaProgress | null
  initialCommunityStats: Record<Category, CommunityStat>
  featuredArticle: ArticleData | null
  staffPicks: StaffPickData[]
  hiddenGem: HiddenGem | null
  initialDailyProgress: DailyProgressState | null
}

const CAT_COLORS: Record<Category, string> = {
  film: "rgba(212,175,55,0.95)",
  tv: "rgba(99,179,237,0.95)",
  book: "rgba(252,129,129,0.95)",
}

const CAT_LABELS: Record<Category, string> = {
  film: "Film",
  tv: "TV Series",
  book: "Book",
}

const OPTION_LETTERS = ["A", "B", "C", "D"]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function getTimeUntilMidnight(rotationDate: string): string {
  const nextDay = new Date(rotationDate + "T00:00:00")
  nextDay.setDate(nextDay.getDate() + 1)
  const diff = nextDay.getTime() - Date.now()
  if (diff <= 0) return "soon"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function computeReadingTime(body: string): number {
  const words = body.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function initCatState(
  q: TriviaQuestion | null,
  ans: TriviaAnswerRecord | null,
  commStat: CommunityStat,
): CatAnswerState {
  if (ans && q) {
    return {
      revealed: true,
      selectedIndex: ans.selectedIndex,
      isCorrect: ans.isCorrect,
      correctIndex: q.correct_index,
      explanation: q.explanation ?? null,
      xpEarned: ans.xpEarned,
      communityStats: commStat,
      submitting: false,
    }
  }
  return {
    revealed: false,
    selectedIndex: null,
    isCorrect: null,
    correctIndex: null,
    explanation: null,
    xpEarned: 0,
    communityStats: null,
    submitting: false,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionEyebrow({ text }: { text: string }) {
  return (
    <p style={{
      fontFamily: SANS,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.32)",
      margin: "0 0 10px",
    }}>
      {text}
    </p>
  )
}

function StreakPill({ label, streak, color }: { label: string; streak: number; color: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${color}33`,
      background: `${color}10`,
      fontFamily: SANS,
      fontSize: 11,
      fontWeight: 600,
      color,
      letterSpacing: "0.02em",
    }}>
      {label} · {streak}-day streak
    </span>
  )
}

function QotDSection({
  rotation,
  questions,
  catStates,
  activeCategory,
  setActiveCategory,
  submitAnswer,
  today,
}: {
  rotation: RotationRow | null
  questions: Record<Category, TriviaQuestion | null>
  catStates: Record<Category, CatAnswerState>
  activeCategory: Category | null
  setActiveCategory: (cat: Category) => void
  submitAnswer: (cat: Category, idx: number) => Promise<void>
  today: string
}) {
  const cats: Category[] = ["film", "tv", "book"]
  const q = activeCategory ? questions[activeCategory] : null
  const cs = activeCategory ? catStates[activeCategory] : null
  const timeLeft = getTimeUntilMidnight(today)

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "#0d0d14",
      padding: "clamp(16px,2.5vw,22px)",
    }}>
      {/* Category pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: activeCategory && q ? "clamp(16px,2.5vw,20px)" : 0 }}>
        {cats.map(cat => {
          const hasQ = !!questions[cat]
          const isActive = activeCategory === cat
          const answered = catStates[cat].revealed
          const activeClass = isActive ? `active-${cat}` : ""
          return (
            <button
              key={cat}
              type="button"
              disabled={!hasQ}
              className={`dr-cat-pill ${activeClass}`}
              onClick={() => setActiveCategory(cat)}
              style={{ opacity: hasQ ? 1 : 0.3 }}
            >
              {answered && (
                <span style={{
                  marginRight: 5,
                  color: catStates[cat].isCorrect === true
                    ? "rgba(29,158,117,0.9)"
                    : catStates[cat].isCorrect === false
                      ? "rgba(239,68,68,0.8)"
                      : "rgba(255,255,255,0.4)",
                }}>
                  {catStates[cat].isCorrect === true ? "✓" : catStates[cat].isCorrect === false ? "✗" : "·"}
                </span>
              )}
              {CAT_LABELS[cat]}
            </button>
          )
        })}
      </div>

      {/* Prompt to select */}
      {!activeCategory && (
        <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "8px 0" }}>
          Select a category to answer today's question
        </p>
      )}

      {/* Question + answers */}
      {activeCategory && q && cs && (
        <div>
          <p style={{
            margin: "0 0 16px",
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: "clamp(14px,2.2vw,16px)",
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.65,
          }}>
            {q.question}
          </p>

          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: cs.revealed ? 16 : 0 }}>
            {q.answers.map((answer, idx) => {
              const isRevealedCorrect = cs.revealed && cs.correctIndex === idx
              const isRevealedWrong = cs.revealed && cs.selectedIndex === idx && !isRevealedCorrect

              let extraClass = ""
              if (cs.revealed) {
                if (isRevealedCorrect) extraClass = " correct-reveal"
                if (isRevealedWrong) extraClass = " selected-wrong"
              }

              return (
                <button
                  key={idx}
                  type="button"
                  className={`dr-answer-btn${extraClass}`}
                  disabled={cs.revealed || cs.submitting}
                  onClick={() => void submitAnswer(activeCategory, idx)}
                >
                  <span style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.04)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.38)",
                    marginTop: 1,
                  }}>
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span>{answer}</span>
                </button>
              )
            })}
          </div>

          {cs.submitting && (
            <p style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              Submitting…
            </p>
          )}

          {cs.revealed && (
            <div style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: cs.isCorrect ? "rgba(29,158,117,0.08)" : cs.isCorrect === false ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${cs.isCorrect ? "rgba(29,158,117,0.22)" : cs.isCorrect === false ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.08)"}`,
            }}>
              <p style={{
                margin: "0 0 4px",
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 700,
                color: cs.isCorrect ? "rgba(29,158,117,0.9)" : cs.isCorrect === false ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.5)",
              }}>
                {cs.isCorrect === true ? "Correct" : cs.isCorrect === false ? "Incorrect" : "Already answered"}
                {cs.xpEarned > 0 && (
                  <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
                    +{cs.xpEarned} XP
                  </span>
                )}
              </p>
              {cs.explanation && (
                <p style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.65 }}>
                  {cs.explanation}
                </p>
              )}
              {cs.communityStats && (
                <p style={{ margin: "0 0 8px", fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
                  {cs.communityStats.percentCorrect}% of {cs.communityStats.totalAnswers} players got this right
                </p>
              )}
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.02em" }}>
                New question in {timeLeft}
              </p>
            </div>
          )}

          {/* No question for selected category */}
          {!q && (
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "8px 0" }}>
              No question available for this category today.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ArticleSection({
  article,
  expanded,
  onToggle,
}: {
  article: ArticleData
  expanded: boolean
  onToggle: () => void
}) {
  const bodyLength = article.body.length
  const preview = article.body.slice(0, 240)
  const readingTime = computeReadingTime(article.body)

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "#0d0d14",
      overflow: "hidden",
    }}>
      {article.cover_image && (
        <div style={{ position: "relative", height: "clamp(150px,28vw,220px)", overflow: "hidden" }}>
          <img
            src={article.cover_image}
            alt={article.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.65)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0d0d14 0%, transparent 55%)" }} />
        </div>
      )}
      <div style={{ padding: "clamp(16px,2.5vw,22px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.28)" }}>
            By {article.author}
          </p>
          <span style={{ color: "rgba(255,255,255,0.14)", fontSize: 10 }}>·</span>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>
            {readingTime} min read
          </p>
        </div>
        <h3 style={{
          margin: "0 0 14px",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: "clamp(16px,3vw,22px)",
          fontWeight: 400,
          color: "rgba(255,255,255,0.92)",
          lineHeight: 1.3,
        }}>
          {article.title}
        </h3>
        <p style={{
          margin: "0 0 16px",
          fontFamily: SERIF,
          fontSize: "clamp(13px,1.8vw,15px)",
          color: "rgba(255,255,255,0.58)",
          lineHeight: 1.8,
        }}>
          {expanded ? article.body : `${preview}${bodyLength > 240 ? "…" : ""}`}
        </p>
        {bodyLength > 240 && (
          <button
            type="button"
            onClick={onToggle}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.5)",
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {expanded ? "Read Less" : "Read More"}
          </button>
        )}
      </div>
    </div>
  )
}

function StaffPicksSection({ picks, onPickClick }: { picks: StaffPickData[]; onPickClick: () => void }) {
  return (
    <div className="dr-row-wrap">
      <div className="dr-row">
        {picks.map(pick => (
          <div key={pick.id} className="dr-pick-card" onClick={onPickClick}>
            <div style={{
              position: "relative",
              aspectRatio: "2/3",
              borderRadius: 8,
              overflow: "hidden",
              background: "#1a1a2e",
              marginBottom: 8,
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              {pick.poster_url ? (
                <img
                  src={pick.poster_url}
                  alt={pick.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 10 }}>
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", margin: 0 }}>
                    {pick.title}
                  </p>
                </div>
              )}
              {/* Staff Pick badge */}
              <div style={{
                position: "absolute",
                top: 6,
                left: 6,
                padding: "2px 7px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(8px)",
                border: "0.5px solid rgba(255,255,255,0.16)",
                fontFamily: SANS,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.62)",
                whiteSpace: "nowrap" as const,
              }}>
                Staff Pick ✨
              </div>
            </div>
            <p style={{ margin: "0 0 2px", fontFamily: SANS, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.82)", lineHeight: 1.3 }}>
              {pick.title}
            </p>
            <p style={{ margin: "0 0 5px", fontFamily: SANS, fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
              {[pick.year ? String(pick.year) : null, CAT_LABELS[pick.media_type]].filter(Boolean).join(" · ")}
            </p>
            {pick.reason && (
              <p style={{
                margin: 0,
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 11,
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}>
                {pick.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function HiddenGemSection({ gem }: { gem: HiddenGem }) {
  const [saved, setSaved] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const mediaType: "movie" | "tv" = gem.media_type === "film" ? "movie" : "tv"

  const handleSave = useCallback(async () => {
    if (saved) return
    setSaved(true)
    await upsertSavedItemToBackend({
      id: gem.id,
      mediaType,
      title: gem.title,
      poster: gem.poster ?? undefined,
      year: Number(gem.year) || 0,
      director: gem.creator || undefined,
      addedAt: new Date().toISOString(),
    })
  }, [saved, gem, mediaType])

  function handleLogSaved(_entry: DiaryEntry) {
    setLogOpen(false)
  }

  return (
    <>
      <div className="dr-gem-card">
        {gem.poster && (
          <div style={{ flexShrink: 0, width: "clamp(90px,16vw,120px)", overflow: "hidden" }}>
            <img
              src={gem.poster}
              alt={gem.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, padding: "clamp(14px,2vw,20px)" }}>
          {/* Badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 8 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(29,158,117,0.12)",
              border: "0.5px solid rgba(29,158,117,0.28)",
              fontFamily: SANS,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              color: "#1d9e75",
            }}>
              Hidden Gem 💎
            </span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              fontFamily: SANS,
              fontSize: 9,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.4)",
            }}>
              {gem.media_type === "film" ? "Film" : "TV Series"}
            </span>
          </div>
          <h3 style={{
            margin: "0 0 3px",
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: "clamp(16px,2.8vw,20px)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.25,
          }}>
            {gem.title}
          </h3>
          <p style={{ margin: "0 0 10px", fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {[gem.year, gem.creator].filter(Boolean).join(" · ")}
          </p>
          <p style={{
            margin: "0 0 14px",
            fontFamily: SANS,
            fontSize: 12,
            color: "rgba(255,255,255,0.52)",
            lineHeight: 1.65,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          }}>
            {gem.overview}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 32,
                padding: "0 14px",
                borderRadius: 999,
                border: "none",
                background: "white",
                color: "black",
                fontFamily: SANS,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap" as const,
              }}
            >
              Log It
            </button>
            <button
              type="button"
              className={`dr-gem-save${saved ? " done" : ""}`}
              disabled={saved}
              onClick={() => void handleSave()}
            >
              {saved ? "Saved ✓" : "Add to Watchlist"}
            </button>
          </div>
        </div>
      </div>

      {logOpen && (
        <DiaryLogModal
          isOpen={logOpen}
          onClose={() => setLogOpen(false)}
          onSaved={handleLogSaved}
          media={{
            title: gem.title,
            media_type: mediaType,
            year: Number(gem.year) || 0,
            poster: gem.poster ?? null,
            creator: gem.creator || null,
            media_id: gem.id,
          }}
        />
      )}
    </>
  )
}

function ProgressSection({
  dp,
  completed,
  progressPct,
  allDone,
}: {
  dp: DailyProgressState
  completed: number
  progressPct: number
  allDone: boolean
}) {
  const items: { key: keyof DailyProgressState; label: string; desc: string }[] = [
    { key: "picked", label: "Daily Pick", desc: "Interact with your daily recommendation" },
    { key: "question_answered", label: "Question of the Day", desc: "Answer one trivia question" },
    { key: "story_read", label: "Today's Story", desc: "Read the featured article" },
    { key: "staff_picks_explored", label: "Staff Picks", desc: "Browse the editors' selections" },
  ]

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "#0d0d14",
      padding: "clamp(16px,2.5vw,22px)",
    }}>
      {allDone && (
        <p style={{
          margin: "0 0 16px",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 15,
          color: "rgba(29,158,117,0.85)",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          You've completed today's edition. 🎉
        </p>
      )}

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.3)" }}>
            Progress
          </span>
          <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "#1d9e75" }}>
            {completed}/4
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: 999,
            background: "#1d9e75",
            width: `${progressPct}%`,
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {items.map(item => (
        <div key={item.key} className="dr-progress-check">
          <div style={{
            flexShrink: 0,
            width: 18,
            height: 18,
            borderRadius: 4,
            border: dp[item.key] ? "none" : "1px solid rgba(255,255,255,0.18)",
            background: dp[item.key] ? "#1d9e75" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s ease",
          }}>
            {dp[item.key] && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontFamily: SANS,
              fontSize: 13,
              fontWeight: 600,
              color: dp[item.key] ? "rgba(255,255,255,0.38)" : "rgba(255,255,255,0.82)",
              textDecoration: dp[item.key] ? "line-through" : "none",
              lineHeight: 1.3,
            }}>
              {item.label}
            </p>
            {!dp[item.key] && (
              <p style={{ margin: "2px 0 0", fontFamily: SANS, fontSize: 11, color: "rgba(255,255,255,0.28)", lineHeight: 1.4 }}>
                {item.desc}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DailyReelPage({
  today,
  userId,
  rotation,
  questions,
  initialAnswers,
  initialProgress,
  initialCommunityStats,
  featuredArticle,
  staffPicks,
  hiddenGem,
  initialDailyProgress,
}: DailyReelPageProps) {
  const [dp, setDp] = useState<DailyProgressState>({
    picked: initialDailyProgress?.picked ?? false,
    question_answered: initialDailyProgress?.question_answered ?? false,
    story_read: initialDailyProgress?.story_read ?? false,
    staff_picks_explored: initialDailyProgress?.staff_picks_explored ?? false,
  })

  // Live-updated trivia progress (streaks update immediately after answering)
  const [progress, setProgress] = useState<TriviaProgress | null>(initialProgress)

  const markProgress = useCallback((field: keyof DailyProgressState) => {
    setDp(prev => {
      if (prev[field]) return prev
      const next = { ...prev, [field]: true }
      const sb = createClient()
      if (sb) {
        void sb.from("daily_progress").upsert(
          {
            user_id: userId,
            progress_date: today,
            picked: next.picked,
            question_answered: next.question_answered,
            story_read: next.story_read,
            staff_picks_explored: next.staff_picks_explored,
          },
          { onConflict: "user_id,progress_date" },
        )
      }
      return next
    })
  }, [userId, today])

  const [activeCategory, setActiveCategory] = useState<Category | null>(null)
  const [catStates, setCatStates] = useState<Record<Category, CatAnswerState>>({
    film: initCatState(questions.film, initialAnswers.film, initialCommunityStats.film),
    tv: initCatState(questions.tv, initialAnswers.tv, initialCommunityStats.tv),
    book: initCatState(questions.book, initialAnswers.book, initialCommunityStats.book),
  })

  const submitAnswer = useCallback(async (cat: Category, idx: number) => {
    const q = questions[cat]
    if (!q || !rotation || catStates[cat].revealed || catStates[cat].submitting) return

    setCatStates(prev => ({ ...prev, [cat]: { ...prev[cat], submitting: true, selectedIndex: idx } }))

    try {
      const res = await fetch("/api/trivia/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          rotationDate: rotation.rotation_date,
          category: cat,
          selectedIndex: idx,
        }),
      })

      if (res.status === 409) {
        setCatStates(prev => ({
          ...prev,
          [cat]: {
            revealed: true,
            selectedIndex: idx,
            isCorrect: null,
            correctIndex: q.correct_index,
            explanation: q.explanation ?? null,
            xpEarned: 0,
            communityStats: null,
            submitting: false,
          },
        }))
        return
      }

      type AnswerResponse = {
        isCorrect: boolean
        correctIndex: number
        xpEarned: number
        explanation: string | null
        communityStats: { totalAnswers: number; percentCorrect: number }
        updatedProgress: Partial<TriviaProgress>
        newBadges: string[]
      }

      const data = (await res.json()) as AnswerResponse

      setCatStates(prev => ({
        ...prev,
        [cat]: {
          revealed: true,
          selectedIndex: idx,
          isCorrect: data.isCorrect,
          correctIndex: data.correctIndex,
          explanation: data.explanation,
          xpEarned: data.xpEarned,
          communityStats: data.communityStats,
          submitting: false,
        },
      }))

      // Update displayed streaks immediately
      if (data.updatedProgress) {
        setProgress(prev => ({
          filmStreak: prev?.filmStreak ?? 0,
          tvStreak: prev?.tvStreak ?? 0,
          bookStreak: prev?.bookStreak ?? 0,
          filmCorrect: prev?.filmCorrect ?? 0,
          tvCorrect: prev?.tvCorrect ?? 0,
          bookCorrect: prev?.bookCorrect ?? 0,
          totalCorrect: prev?.totalCorrect ?? 0,
          longestStreak: prev?.longestStreak ?? 0,
          ...data.updatedProgress,
        }))
      }

      markProgress("question_answered")
    } catch {
      setCatStates(prev => ({ ...prev, [cat]: { ...prev[cat], submitting: false } }))
    }
  }, [questions, rotation, catStates, markProgress])

  const [articleExpanded, setArticleExpanded] = useState(false)

  const handleReadMore = useCallback(() => {
    setArticleExpanded(e => {
      if (!e) markProgress("story_read")
      return !e
    })
  }, [markProgress])

  const handleStaffPickClick = useCallback(() => {
    markProgress("staff_picks_explored")
  }, [markProgress])

  const handlePickClick = useCallback(() => {
    markProgress("picked")
  }, [markProgress])

  const completed = [dp.picked, dp.question_answered, dp.story_read, dp.staff_picks_explored].filter(Boolean).length
  const progressPct = (completed / 4) * 100
  const allDone = completed === 4

  // Derive streaks from live-updated state
  const filmStreak = progress?.filmStreak ?? 0
  const tvStreak = progress?.tvStreak ?? 0
  const bookStreak = progress?.bookStreak ?? 0
  const hasAnyStreak = filmStreak > 0 || tvStreak > 0 || bookStreak > 0

  return (
    <>
      <style>{`
        @keyframes dr-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dr-section { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
        .dr-section { animation: dr-fade 0.4s ease both; }
        .dr-section:nth-child(1) { animation-delay: 0.00s; }
        .dr-section:nth-child(2) { animation-delay: 0.05s; }
        .dr-section:nth-child(3) { animation-delay: 0.10s; }
        .dr-section:nth-child(4) { animation-delay: 0.15s; }
        .dr-section:nth-child(5) { animation-delay: 0.20s; }
        .dr-section:nth-child(6) { animation-delay: 0.25s; }
        .dr-section:nth-child(7) { animation-delay: 0.30s; }
        .dr-section:nth-child(8) { animation-delay: 0.35s; }

        .dr-cat-pill {
          cursor: pointer;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          font-family: ${SANS};
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.04em;
          transition: all 0.15s ease;
          user-select: none;
        }
        .dr-cat-pill:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.22);
          color: rgba(255,255,255,0.8);
        }
        .dr-cat-pill:disabled { cursor: default; }
        .dr-cat-pill.active-film {
          background: rgba(212,175,55,0.12);
          border-color: rgba(212,175,55,0.35);
          color: rgba(212,175,55,0.95);
        }
        .dr-cat-pill.active-tv {
          background: rgba(99,179,237,0.12);
          border-color: rgba(99,179,237,0.35);
          color: rgba(99,179,237,0.95);
        }
        .dr-cat-pill.active-book {
          background: rgba(252,129,129,0.12);
          border-color: rgba(252,129,129,0.35);
          color: rgba(252,129,129,0.95);
        }

        .dr-answer-btn {
          width: 100%;
          text-align: left;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.7);
          font-family: ${SANS};
          font-size: 13px;
          line-height: 1.5;
          cursor: pointer;
          transition: all 0.12s ease;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .dr-answer-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.16);
          color: rgba(255,255,255,0.9);
        }
        .dr-answer-btn:disabled { cursor: default; }
        .dr-answer-btn.selected-wrong {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.3);
          color: rgba(255,255,255,0.88);
        }
        .dr-answer-btn.correct-reveal {
          background: rgba(29,158,117,0.12);
          border-color: rgba(29,158,117,0.35);
          color: rgba(255,255,255,0.88);
        }

        .dr-row-wrap { overflow: hidden; }
        .dr-row {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          padding-bottom: 4px;
        }
        .dr-row::-webkit-scrollbar { display: none; }
        .dr-pick-card {
          flex-shrink: 0;
          scroll-snap-align: start;
          width: clamp(120px,28vw,150px);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .dr-pick-card:hover { transform: translateY(-2px); }
        @media (max-width: 760px) {
          .dr-row-wrap { margin-inline: -14px; }
          .dr-row { padding-inline: 14px 32px; }
        }

        .dr-gem-card {
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: #0d0d14;
          overflow: hidden;
          display: flex;
        }
        .dr-gem-save {
          display: inline-flex;
          align-items: center;
          height: 32px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.68);
          font-family: ${SANS};
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dr-gem-save:hover:not(.done) { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.9); }
        .dr-gem-save.done { color: rgba(255,255,255,0.32); cursor: default; border-color: rgba(255,255,255,0.08); }

        .dr-progress-check {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .dr-progress-check:last-child { border-bottom: none; }
      `}</style>

      {/* ── 1. HEADER ──────────────────────────────────────────────────────────── */}
      <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
        <p style={{
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.28)",
          margin: "0 0 8px",
        }}>
          Today's Edition
        </p>
        <h1 style={{
          margin: "0 0 14px",
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: "clamp(22px,4vw,34px)",
          fontWeight: 400,
          letterSpacing: "-0.3px",
          color: "rgba(255,255,255,0.92)",
          lineHeight: 1.15,
        }}>
          {formatDate(today)}
        </h1>
        {hasAnyStreak && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {filmStreak > 0 && <StreakPill label="Film" streak={filmStreak} color={CAT_COLORS.film} />}
            {tvStreak > 0 && <StreakPill label="TV" streak={tvStreak} color={CAT_COLORS.tv} />}
            {bookStreak > 0 && <StreakPill label="Book" streak={bookStreak} color={CAT_COLORS.book} />}
          </div>
        )}
      </div>

      {/* ── 2. DAILY PICK ──────────────────────────────────────────────────────── */}
      <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
        <SectionEyebrow text="Daily Pick" />
        <div onClickCapture={handlePickClick}>
          <DailyPickCard />
        </div>
      </div>

      {/* ── 3. QUESTION OF THE DAY ─────────────────────────────────────────────── */}
      <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
        <SectionEyebrow text="Question of the Day" />
        <QotDSection
          rotation={rotation}
          questions={questions}
          catStates={catStates}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          submitAnswer={submitAnswer}
          today={today}
        />
      </div>

      {/* ── 4. TODAY'S STORY ───────────────────────────────────────────────────── */}
      {featuredArticle && (
        <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
          <SectionEyebrow text="Today's Story" />
          <ArticleSection
            article={featuredArticle}
            expanded={articleExpanded}
            onToggle={handleReadMore}
          />
        </div>
      )}

      {/* ── 5. STAFF PICKS ─────────────────────────────────────────────────────── */}
      {staffPicks.length > 0 && (
        <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
          <SectionEyebrow text="Today's Staff Picks" />
          <StaffPicksSection picks={staffPicks} onPickClick={handleStaffPickClick} />
        </div>
      )}

      {/* ── 6. HIDDEN GEM ──────────────────────────────────────────────────────── */}
      {hiddenGem && (
        <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
          <SectionEyebrow text="Hidden Gem" />
          <HiddenGemSection gem={hiddenGem} />
        </div>
      )}

      {/* ── 7. TODAY'S PROGRESS ────────────────────────────────────────────────── */}
      <div className="dr-section" style={{ marginBottom: "clamp(20px,3vw,32px)" }}>
        <SectionEyebrow text="Today's Progress" />
        <ProgressSection
          dp={dp}
          completed={completed}
          progressPct={progressPct}
          allDone={allDone}
        />
      </div>
    </>
  )
}
