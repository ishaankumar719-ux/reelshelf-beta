export interface StreakStats {
  currentStreak: number
  longestStreak: number
  lastLogDate: string | null
  streakActive: boolean
}

export function computeStreak(watchedDates: string[]): StreakStats {
  if (!watchedDates.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakActive: false,
    }
  }

  const unique = Array.from(new Set(watchedDates)).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const toDay = (value: string) => {
    const day = new Date(value)
    day.setHours(0, 0, 0, 0)
    return day
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const lastLog = toDay(unique[0])
  const streakActive = lastLog >= yesterday

  let currentStreak = streakActive ? 1 : 0

  if (streakActive) {
    for (let index = 1; index < unique.length; index += 1) {
      const diff =
        (toDay(unique[index - 1]).getTime() - toDay(unique[index]).getTime()) /
        86400000

      if (diff === 1) {
        currentStreak += 1
      } else {
        break
      }
    }
  }

  let longestStreak = 1
  let run = 1

  for (let index = 1; index < unique.length; index += 1) {
    const diff =
      (toDay(unique[index - 1]).getTime() - toDay(unique[index]).getTime()) /
      86400000

    if (diff === 1) {
      run += 1
      longestStreak = Math.max(longestStreak, run)
    } else {
      run = 1
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastLogDate: unique[0],
    streakActive,
  }
}
