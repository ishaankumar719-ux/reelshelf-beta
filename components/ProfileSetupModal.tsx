"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getProfileInitials,
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from "../lib/profile";

type ProfileSetupValues = {
  username: string;
  displayName: string;
  avatarFile: File | null;
};

export default function ProfileSetupModal({
  open,
  saving,
  initialUsername,
  initialDisplayName,
  initialAvatarUrl,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  initialUsername?: string | null;
  initialDisplayName?: string | null;
  initialAvatarUrl?: string | null;
  onSubmit: (values: ProfileSetupValues) => Promise<string | null | undefined>;
}) {
  const [username, setUsername] = useState(initialUsername || "");
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialAvatarUrl || null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setUsername(initialUsername || "");
    setDisplayName(initialDisplayName || "");
    setAvatarFile(null);
    setAvatarPreview(initialAvatarUrl || null);
    setError(null);
  }, [initialAvatarUrl, initialDisplayName, initialUsername, open]);

  useEffect(() => {
    if (!avatarFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const previewHandle = useMemo(() => {
    const normalized = normalizeUsername(username);
    return normalized ? `@${normalized}` : "@username";
  }, [username]);

  const previewName = useMemo(() => {
    const normalized = normalizeDisplayName(displayName);
    return normalized || "Display Name";
  }, [displayName]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const displayNameError = validateDisplayName(displayName);
    if (displayNameError) {
      setError(displayNameError);
      return;
    }

    if (!avatarPreview && !avatarFile) {
      setError("Add a profile picture to finish setting up your profile.");
      return;
    }

    const nextError = await onSubmit({
      username: normalizeUsername(username),
      displayName: normalizeDisplayName(displayName),
      avatarFile,
    });

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
        background: "rgba(0,0,0,0.74)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle at top left, rgba(255,255,255,0.07), transparent 28%), linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(7,7,7,0.98) 100%)",
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
          Complete Your Profile
        </p>

        <h2
          style={{
            margin: 0,
            fontSize: 40,
            lineHeight: 0.98,
            letterSpacing: "-1.8px",
            fontWeight: 600,
            maxWidth: 560,
          }}
        >
          Give your ReelShelf account a real on-screen identity.
        </h2>

        <p
          style={{
            margin: "14px 0 0",
            color: "#c7c7c7",
            fontSize: 16,
            lineHeight: 1.65,
            maxWidth: 560,
          }}
        >
          Your email stays private for sign-in only. Pick a username, a display
          name, and an avatar so ReelShelf can feel personal now and public-profile
          ready later.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px minmax(0, 1fr)",
              gap: 22,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                padding: 18,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 22,
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #161616 0%, #090909 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={previewName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      color: "rgba(255,255,255,0.76)",
                      fontSize: 36,
                      fontWeight: 600,
                    }}
                  >
                    {getProfileInitials({
                      displayName: previewName,
                      username: username || null,
                    })}
                  </div>
                )}
              </div>

              <label
                style={{
                  marginTop: 14,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {avatarPreview ? "Change profile picture" : "Upload profile picture"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setAvatarFile(file);
                    if (error) {
                      setError(null);
                    }
                  }}
                  style={{ display: "none" }}
                />
              </label>

              <p
                style={{
                  margin: "10px 0 0",
                  color: "#7f7f7f",
                  fontSize: 12,
                  lineHeight: 1.6,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                JPG, PNG, WEBP, or GIF. Best at square crop.
              </p>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
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
                  Display Name
                </span>

                <input
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
                  placeholder="Your name on ReelShelf"
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
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: "16px 18px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#7f7f7f",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Preview
                </p>
                <h3
                  style={{
                    margin: "10px 0 0",
                    fontSize: 24,
                    letterSpacing: "-0.8px",
                    fontWeight: 500,
                  }}
                >
                  {previewName}
                </h3>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#9ca3af",
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {previewHandle}
                </p>
              </div>
            </div>
          </div>

          {error ? (
            <p
              style={{
                margin: "16px 0 0",
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
            {saving ? "Saving profile..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
