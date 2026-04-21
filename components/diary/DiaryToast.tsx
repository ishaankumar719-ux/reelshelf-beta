"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface DiaryToastProps {
  message: string;
  onDismiss: () => void;
}

export default function DiaryToast({ message, onDismiss }: DiaryToastProps) {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dismissTimer = window.setTimeout(() => {
      setLeaving(true);
      window.setTimeout(onDismiss, 150);
    }, 3000);

    return () => window.clearTimeout(dismissTimer);
  }, [onDismiss]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <style>{`
        @keyframes reelshelf-toast-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes reelshelf-toast-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          right: "max(16px, env(safe-area-inset-right, 0px) + 16px)",
          bottom: "max(16px, env(safe-area-inset-bottom, 0px) + 16px)",
          left: "auto",
          zIndex: 70,
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "#12121f",
            borderLeft: "3px solid #1D9E75",
            border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            maxWidth: 300,
            color: "rgba(255,255,255,0.85)",
            boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
            animation: leaving
              ? "reelshelf-toast-out 150ms ease forwards"
              : "reelshelf-toast-in 200ms ease forwards",
            pointerEvents: "auto",
          }}
        >
          {message}
        </div>
      </div>
    </>,
    document.body
  );
}
