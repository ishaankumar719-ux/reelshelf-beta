"use client"

import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import SearchInput from "@/src/components/search/SearchInput"
import SearchResults from "@/src/components/search/SearchResults"
import { useSearch, type SearchResult } from "@/src/hooks/useSearch"
import { useSearchHistory } from "@/src/hooks/useSearchHistory"

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function resolveHref(result: SearchResult) {
  return result.href || "/"
}

export default function GlobalSearch() {
  const pathname = usePathname()
  const router = useRouter()
  const { query, setQuery, results, isLoading, clear } = useSearch()
  const { recentQueries, recentResults, addQuery, addResult } = useSearchHistory()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const desktopShellRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [isDesktopOpen, setIsDesktopOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const selectableItems = useMemo(() => {
    if (query.trim()) {
      return results
    }

    return recentResults
  }, [query, results, recentResults])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleOpenSearch() { setIsMobileOpen(true) }
    function handleCloseSearch() { setIsMobileOpen(false); setIsDesktopOpen(false); setActiveIndex(-1) }
    window.addEventListener("rs:open-search", handleOpenSearch)
    window.addEventListener("rs:close-search", handleCloseSearch)
    return () => {
      window.removeEventListener("rs:open-search", handleOpenSearch)
      window.removeEventListener("rs:close-search", handleCloseSearch)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        if (window.innerWidth >= 768) {
          setIsDesktopOpen(true)
          inputRef.current?.focus()
        } else {
          setIsMobileOpen(true)
        }
      }

      if (event.key === "Escape") {
        setIsDesktopOpen(false)
        setIsMobileOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [mounted])

  useEffect(() => {
    function updateRect() {
      if (!desktopShellRef.current) return
      const rect = desktopShellRef.current.getBoundingClientRect()
      setDropdownRect({
        top: window.scrollY + rect.bottom + 8,
        left: window.scrollX + rect.left,
        width: rect.width,
      })
    }

    updateRect()

    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [])

  useEffect(() => {
    if (!isDesktopOpen) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node

      if (
        desktopShellRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }

      setIsDesktopOpen(false)
      setActiveIndex(-1)
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isDesktopOpen])

  useEffect(() => {
    setActiveIndex(-1)
  }, [query, results, recentResults, isMobileOpen, isDesktopOpen])

  useEffect(() => {
    setIsDesktopOpen(false)
    setIsMobileOpen(false)
    setActiveIndex(-1)
  }, [pathname])

  function closeAll() {
    setIsDesktopOpen(false)
    setIsMobileOpen(false)
    setActiveIndex(-1)
  }

  function handleSelect(result: SearchResult) {
    addResult(result)
    if (query.trim()) {
      addQuery(query)
    }
    router.push(resolveHref(result))
    clear()
    closeAll()
  }

  function handleQuerySubmit(nextQuery: string) {
    const normalized = nextQuery.trim()
    if (!normalized) return

    addQuery(normalized)
    console.log("[SEARCH] navigation start, query:", normalized)
    router.push(`/search?q=${encodeURIComponent(normalized)}`)
    setIsDesktopOpen(false)
    setIsMobileOpen(false)
    setActiveIndex(-1)
  }

  function handleInputChange(value: string) {
    console.log("[SEARCH] raw input value:", value)
    setQuery(value)
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (selectableItems.length > 0) {
        setActiveIndex((current) => Math.min(current + 1, selectableItems.length - 1))
      }
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, -1))
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      if (activeIndex >= 0 && selectableItems[activeIndex]) {
        handleSelect(selectableItems[activeIndex])
      } else if (query.trim()) {
        handleQuerySubmit(query)
      }
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      closeAll()
      inputRef.current?.blur()
    }
  }

  const dropdownOpen = isDesktopOpen && (query.trim().length >= 2 || recentQueries.length > 0 || recentResults.length > 0)

  const dropdown = mounted && dropdownOpen && dropdownRect
    ? createPortal(
        <div
          ref={dropdownRef}
          className="absolute z-[60]"
          style={{
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: Math.max(dropdownRect.width, 400),
          }}
        >
          <SearchResults
            results={results}
            recentResults={recentResults}
            recentQueries={recentQueries}
            isLoading={isLoading}
            query={query}
            onSelect={handleSelect}
            onQuerySelect={(nextQuery) => {
              setQuery(nextQuery)
              setIsDesktopOpen(true)
              inputRef.current?.focus()
            }}
            variant="dropdown"
            activeIndex={activeIndex}
          />
        </div>,
        document.body
      )
    : null

  const overlay = mounted && isMobileOpen
    ? createPortal(
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "#05050b",
            display: "flex",
            flexDirection: "column",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Search bar header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
              <SearchIcon />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchInput
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                inputRef={inputRef}
                autoFocus
                isFocused
                activeDescendantId={activeIndex >= 0 ? `global-search-option-${activeIndex}` : null}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                clear()
                closeAll()
              }}
              style={{
                background: "none",
                border: "none",
                padding: "6px 4px",
                cursor: "pointer",
                color: "rgba(255,255,255,0.65)",
                fontSize: 14,
                fontFamily: '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif',
                flexShrink: 0,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
              }}
            >
              Cancel
            </button>
          </div>

          {/* Scrollable results */}
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ padding: "0 16px 24px" }}>
              <SearchResults
                results={results}
                recentResults={recentResults}
                recentQueries={recentQueries}
                isLoading={isLoading}
                query={query}
                onSelect={handleSelect}
                onQuerySelect={setQuery}
                variant="overlay"
                activeIndex={activeIndex}
              />
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      {/* Desktop search bar — shown below header, hidden on mobile */}
      <div className="hidden border-b border-white/8 bg-[#07070d] md:block">
        <div className="mx-auto flex h-[52px] max-w-[1600px] items-center justify-end px-6">
          <div ref={desktopShellRef} className="w-full max-w-[400px] min-w-[240px]">
            <SearchInput
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsDesktopOpen(true)}
              inputRef={inputRef}
              showShortcutHint
              isFocused={isDesktopOpen}
              activeDescendantId={activeIndex >= 0 ? `global-search-option-${activeIndex}` : null}
            />
          </div>
        </div>
      </div>

      {dropdown}
      {overlay}
    </>
  )
}
