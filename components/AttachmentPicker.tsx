"use client";

import { useEffect, useRef, useState } from "react";
import { uploadAttachment } from "../lib/supabase/storage";

interface GiphyGif {
  id: string;
  title: string;
  images: {
    fixed_height_small: { url: string };
    downsized: { url: string };
  };
}

async function fetchGifs(query: string): Promise<GiphyGif[]> {
  // Read the key lazily so it's always current at call time
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
  if (!key) return [];
  try {
    const base = "https://api.giphy.com/v1/gifs";
    const endpoint = query.trim()
      ? `${base}/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=18&rating=g`
      : `${base}/trending?api_key=${key}&limit=18&rating=g`;
    const res = await fetch(endpoint);
    if (!res.ok) return [];
    const json = (await res.json()) as { data: GiphyGif[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

function hasGiphyKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GIPHY_API_KEY);
}

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

  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);

  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  useEffect(() => {
    if (!showGifPicker) return;
    const delay = gifSearch ? 400 : 0;
    const timer = window.setTimeout(async () => {
      setGifLoading(true);
      const gifs = await fetchGifs(gifSearch);
      setGifResults(gifs);
      setGifLoading(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [gifSearch, showGifPicker]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
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
    setShowGifPicker(false);
    setGifSearch("");
    setUploadError(null);
  }

  function selectGif(gif: GiphyGif) {
    onChange({ url: gif.images.downsized.url, type: "gif" });
    setShowGifPicker(false);
    setGifSearch("");
    setGifResults([]);
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

  const h = compact ? 26 : 30;
  const fs = compact ? 11 : 12;

  // ── Preview state ─────────────────────────────────────────────────────────
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
          {value.type === "gif" && (
            <span
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                background: "rgba(0,0,0,0.6)",
                borderRadius: 4,
                padding: "2px 5px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#fff",
              }}
            >
              GIF
            </span>
          )}
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
              color: "#fff",
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

  // ── Controls ──────────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 8 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Button row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>

        {/* Upload Image */}
        <button
          type="button"
          onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
          disabled={uploading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: h,
            padding: "0 12px",
            borderRadius: 999,
            border: "0.5px solid rgba(255,255,255,0.18)",
            background: uploading ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
            color: uploading ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
            fontSize: fs,
            cursor: uploading ? "default" : "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: fs + 1 }}>📷</span>
          <span>{uploading ? "Uploading…" : "Image"}</span>
        </button>

        {/* GIF button — always visible */}
        <button
          type="button"
          onClick={() => {
            setShowGifPicker((prev) => !prev);
            setShowUrlFallback(false);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: h,
            padding: "0 12px",
            borderRadius: 999,
            border: showGifPicker
              ? "0.5px solid rgba(255,210,0,0.5)"
              : "0.5px solid rgba(255,210,0,0.3)",
            background: showGifPicker
              ? "rgba(255,210,0,0.18)"
              : "rgba(255,210,0,0.08)",
            color: showGifPicker
              ? "rgba(255,210,0,1)"
              : "rgba(255,210,0,0.7)",
            fontSize: fs,
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          GIF
        </button>

        {/* Paste URL — only when no other panel is open */}
        {!showUrlFallback && !showGifPicker && (
          <button
            type="button"
            onClick={() => { setShowUrlFallback(true); setShowGifPicker(false); }}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "rgba(255,255,255,0.25)",
              fontSize: compact ? 10 : 11,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            Paste URL
          </button>
        )}
      </div>

      {/* GIF picker panel */}
      {showGifPicker && (
        <div
          style={{
            marginTop: 8,
            borderRadius: 12,
            border: "0.5px solid rgba(255,255,255,0.12)",
            background: "rgba(8,8,18,0.97)",
            overflow: "hidden",
          }}
        >
          {/* Search */}
          <div style={{ padding: "8px 8px 6px" }}>
            <input
              type="text"
              value={gifSearch}
              onChange={(e) => setGifSearch(e.target.value)}
              placeholder="Search GIFs…"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              style={{
                width: "100%",
                borderRadius: 8,
                border: "0.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                padding: "7px 10px",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Results grid */}
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "0 8px 8px" }}>
            {gifLoading ? (
              <p style={{ margin: 0, padding: "16px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "inherit" }}>
                Loading…
              </p>
            ) : !hasGiphyKey() ? (
              <p style={{ margin: 0, padding: "12px 0", fontSize: 11, color: "rgba(255,100,100,0.7)", fontFamily: "inherit", textAlign: "center" }}>
                Add <code style={{ background: "rgba(255,255,255,0.08)", borderRadius: 3, padding: "1px 4px" }}>NEXT_PUBLIC_GIPHY_API_KEY</code> to .env.local
              </p>
            ) : gifResults.length === 0 && !gifLoading ? (
              <p style={{ margin: 0, padding: "16px 0", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "inherit" }}>
                {gifSearch ? "No results" : "Loading trending…"}
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                {gifResults.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => selectGif(gif)}
                    style={{
                      padding: 0,
                      border: "none",
                      background: "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      borderRadius: 6,
                      overflow: "hidden",
                      aspectRatio: "4/3",
                      display: "block",
                    }}
                  >
                    <img
                      src={gif.images.fixed_height_small.url}
                      alt={gif.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GIPHY attribution */}
          <div style={{ padding: "4px 8px 6px", textAlign: "right" }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "inherit" }}>
              Powered by GIPHY
            </span>
          </div>
        </div>
      )}

      {/* URL fallback */}
      {showUrlFallback && (
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
            style={{ height: h, padding: "0 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.88)", color: "#000", fontSize: fs, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
          >
            Use
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlFallback(false); setUrlInput(""); }}
            style={{ height: h, padding: "0 10px", borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.38)", fontSize: fs, cursor: "pointer", flexShrink: 0 }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(255,100,100,0.8)", fontFamily: "inherit" }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}
