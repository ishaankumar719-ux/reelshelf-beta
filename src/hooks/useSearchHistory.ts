"use client"

import { useEffect, useState } from "react"
import type { SearchResult } from "@/src/hooks/useSearch"

const STORAGE_KEY = "reelshelf_search_history"

type SearchHistoryState = {
  recentQueries: string[]
  recentResults: SearchResult[]
}

function readHistory(): SearchHistoryState {
  if (typeof window === "undefined") {
    return { recentQueries: [], recentResults: [] }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return { recentQueries: [], recentResults: [] }
    }

    const parsed = JSON.parse(raw) as Partial<SearchHistoryState>

    return {
      recentQueries: Array.isArray(parsed.recentQueries) ? parsed.recentQueries.slice(0, 5) : [],
      recentResults: Array.isArray(parsed.recentResults) ? parsed.recentResults.slice(0, 5) : [],
    }
  } catch {
    return { recentQueries: [], recentResults: [] }
  }
}

function writeHistory(nextState: SearchHistoryState) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  } catch {
    // Ignore storage failures silently.
  }
}

export interface UseSearchHistoryReturn {
  recentQueries: string[]
  recentResults: SearchResult[]
  addQuery: (q: string) => void
  addResult: (r: SearchResult) => void
  clear: () => void
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [state, setState] = useState<SearchHistoryState>({
    recentQueries: [],
    recentResults: [],
  })

  useEffect(() => {
    setState(readHistory())
  }, [])

  function update(nextState: SearchHistoryState) {
    setState(nextState)
    writeHistory(nextState)
  }

  return {
    recentQueries: state.recentQueries,
    recentResults: state.recentResults,
    addQuery: (query) => {
      const normalized = query.trim()

      if (!normalized) return

      update({
        recentQueries: [
          normalized,
          ...state.recentQueries.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
        ].slice(0, 5),
        recentResults: state.recentResults,
      })
    },
    addResult: (result) => {
      update({
        recentQueries: state.recentQueries,
        recentResults: [
          result,
          ...state.recentResults.filter(
            (item) => !(item.media_type === result.media_type && item.id === result.id)
          ),
        ].slice(0, 5),
      })
    },
    clear: () => update({ recentQueries: [], recentResults: [] }),
  }
}
