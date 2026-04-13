"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"

interface AccountDropdownProps {
  username: string | null
  onClose: () => void
}

export default function AccountDropdown({ username, onClose }: AccountDropdownProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleSignOut = async () => {
    console.log("[NAV DROPDOWN] signing out")
    try {
      await signOut()
      console.log("[NAV DROPDOWN] signOut success")
      onClose()
      router.push("/auth")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sign out error"
      console.error("[NAV DROPDOWN] signOut error:", message)
    }
  }

  const menuItem = (label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "9px 16px",
        fontSize: "13px",
        fontWeight: 400,
        color: danger ? "rgba(240,100,100,0.9)" : "rgba(255,255,255,0.8)",
        background: "none",
        border: "none",
        cursor: "pointer",
        borderRadius: "6px",
        transition: "background 0.12s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = "rgba(255,255,255,0.07)"
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "none"
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        minWidth: "168px",
        background: "#12121f",
        border: "0.5px solid rgba(255,255,255,0.12)",
        borderRadius: "10px",
        padding: "6px",
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {menuItem("View profile", () => {
        if (username) {
          router.push(`/u/${username}`)
        }
        onClose()
      })}
      {menuItem("Edit profile", () => {
        router.push("/profile")
        onClose()
      })}
      <div
        style={{
          height: "0.5px",
          background: "rgba(255,255,255,0.08)",
          margin: "4px 8px",
        }}
      />
      {menuItem("Sign out", handleSignOut, true)}
    </div>
  )
}
