"use client"

import type { KeyboardEventHandler, RefObject } from "react"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
  onFocus?: () => void
  onBlur?: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  placeholder?: string
  autoFocus?: boolean
  showShortcutHint?: boolean
  isFocused?: boolean
  activeDescendantId?: string | null
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export default function SearchInput({
  value,
  onChange,
  onKeyDown,
  onFocus,
  inputRef,
  placeholder = "Search films, series, books…",
  autoFocus = false,
  showShortcutHint = false,
  isFocused = false,
  activeDescendantId = null,
}: SearchInputProps) {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)

  return (
    <div
      className={`flex h-10 items-center gap-2 rounded-md border px-3 text-white transition ${
        isFocused ? "border-white/30 bg-white/[0.09]" : "border-white/12 bg-white/[0.07]"
      }`}
    >
      <span className="text-white/35">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-activedescendant={activeDescendantId || undefined}
        aria-autocomplete="list"
        aria-expanded="true"
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
      />
      {showShortcutHint && !isFocused && isMac ? (
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/36">
          ⌘K
        </span>
      ) : null}
      {showShortcutHint && !isFocused && !isMac ? (
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/36">
          Ctrl K
        </span>
      ) : null}
    </div>
  )
}
