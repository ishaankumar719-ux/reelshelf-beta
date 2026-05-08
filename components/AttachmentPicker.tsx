"use client";

import { useRef, useState } from "react";
import { uploadAttachment } from "../lib/supabase/storage";

// TODO: Add GIF picker here when GIPHY/Tenor API key is available.
// Suggested interface: show "Add GIF" button that opens an inline search modal.

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";

export interface AttachmentValue {
  url: string;
  type: "image" | "gif";
}

interface AttachmentPickerProps {
  value: AttachmentValue | null;
  onChange: (v: AttachmentValue | null) => void;
  compact?: boolean;
}

export default function AttachmentPicker({
  value,
  onChange,
  compact = false,
}: AttachmentPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    const result = await uploadAttachment(file);
    setUploading(false);

    if ("error" in result) {
      setUploadError(result.error);
    } else {
      onChange({ url: result.url, type: result.type });
    }
  }

  function handleRemove() {
    onChange(null);
    setUrlInput("");
    setShowUrlFallback(false);
    setUploadError(null);
  }

  function handleUrlConfirm() {
    const url = urlInput.trim();
    if (!url) { setShowUrlFallback(false); return; }
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
    const type: "image" | "gif" = ext === "gif" ? "gif" : "image";
    onChange({ url, type });
    setUrlInput("");
    setShowUrlFallback(false);
  }

  const height = compact ? 26 : 30;
  const fontSize = compact ? 11 : 12;

  // ── Preview state: attachment already chosen ──────────────────────────────
  if (value) {
    return (
      <div style={{ marginTop: 8 }}>
        <div
          style={{
            position: "relative",
            display: "inline-block",
            borderRadius: 10,
            overflow: "hidden",
            border: "0.5px solid rgba(255,255,255,0.1)",
            maxWidth: compact ? 200 : 280,
            width: "100%",
          }}
        >
          <img
            src={value.url}
            alt="Attachment preview"
            style={{
              width: "100%",
              display: "block",
              maxHeight: compact ? 140 : 180,
              objectFit: "cover",
            }}
          />
          {value.type === "gif" ? (
            <span
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                background: "rgba(0,0,0,0.55)",
                borderRadius: 4,
                padding: "2px 5px",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              GIF
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove attachment"
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.65)",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state: show upload controls ─────────────────────────────────────
  return (
    <div style={{ marginTop: 8 }}>
      {/* Hidden file input — triggers iOS camera roll on mobile Safari */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Primary: Upload Image */}
        <button
          type="button"
          onClick={() => {
            setUploadError(null);
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height,
            padding: "0 12px",
            borderRadius: 999,
            border: "0.5px solid rgba(255,255,255,0.14)",
            background: uploading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
            color: uploading ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.78)",
            fontSize,
            cursor: uploading ? "default" : "pointer",
            transition: "all 0.15s ease",
            fontFamily: "inherit",
          }}
        >
          <span>📷</span>
          <span>{uploading ? "Uploading…" : "Upload Image"}</span>
        </button>

        {/* TODO: "Add GIF" button — insert GIF picker component here */}

        {/* Secondary: URL fallback */}
        {!showUrlFallback && !uploading ? (
          <button
            type="button"
            onClick={() => setShowUrlFallback(true)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "rgba(255,255,255,0.22)",
              fontSize: compact ? 10 : 11,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            Paste URL instead
          </button>
        ) : null}
      </div>

      {/* URL fallback input */}
      {showUrlFallback ? (
        <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlConfirm(); } }}
            placeholder="Paste image URL…"
            autoFocus
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 8,
              border: "0.5px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.78)",
              padding: "6px 10px",
              fontSize: compact ? 12 : 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={handleUrlConfirm}
            style={{
              height,
              padding: "0 12px",
              borderRadius: 8,
              border: "none",
              background: "rgba(255,255,255,0.88)",
              color: "#000",
              fontSize,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Use
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlFallback(false); setUrlInput(""); }}
            style={{
              height,
              padding: "0 10px",
              borderRadius: 8,
              border: "0.5px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.38)",
              fontSize,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {/* Upload error */}
      {uploadError ? (
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(255,100,100,0.8)", fontFamily: "inherit" }}>
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
