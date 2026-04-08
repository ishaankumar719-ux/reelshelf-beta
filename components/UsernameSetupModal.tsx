"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeUsername, validateUsername } from "../lib/profile";

export default function UsernameSetupModal({
  open,
  saving,
  initialValue,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  initialValue?: string;
  onSubmit: (username: string) => Promise<string | null | undefined>;
}) {
  const [username, setUsername] = useState(initialValue || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUsername(initialValue || "");
      setError(null);
    }
  }, [initialValue, open]);

  const preview = useMemo(() => {
    const normalized = normalizeUsername(username);
    return normalized ? `@${normalized}` : "@username";
  }, [username]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateUsername(username);

    if (validationError) {
      setError(validationError);
      return;
    }

    const nextError = await onSubmit(normalizeUsername(username));
    setError(nextError || null);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.07), transparent 30%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
          boxShadow: "0 32px 90px rgba(0,0,0,0.42)",
          padding: "32px 30px 28px",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#7f7f7f",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Choose Your Username
        </p>

        <h2
          style={{
            margin: 0,
            fontSize: 40,
            lineHeight: 0.98,
            letterSpacing: "-1.8px",
            fontWeight: 600,
            maxWidth: 460,
          }}
        >
          Make your ReelShelf identity feel like yours.
        </h2>

        <p
          style={{
            margin: "14px 0 0",
            color: "#c7c7c7",
            fontSize: 16,
            lineHeight: 1.65,
            maxWidth: 470,
          }}
        >
          Your email stays private for sign-in only. This username will be shown
          around the app and is ready for future public profile URLs.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <label style={{ display: "grid", gap: 10 }}>
            <span
              style={{
                color: "#d1d5db",
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Username
            </span>

            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="username"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "white",
                padding: "0 16px",
                fontSize: 16,
                outline: "none",
              }}
            />
          </label>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#9ca3af",
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Preview: {preview}
            </p>

            <p
              style={{
                margin: 0,
                color: "#7f7f7f",
                fontSize: 12,
                lineHeight: 1.6,
                fontFamily: "Arial, sans-serif",
              }}
            >
              3-24 chars, lowercase letters, numbers, underscores
            </p>
          </div>

          {error ? (
            <p
              style={{
                margin: "14px 0 0",
                color: "#fca5a5",
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 22,
              width: "100%",
              height: 48,
              borderRadius: 999,
              border: "none",
              background: "white",
              color: "black",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "Arial, sans-serif",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving username..." : "Save Username"}
          </button>
        </form>
      </div>
    </div>
  );
}
