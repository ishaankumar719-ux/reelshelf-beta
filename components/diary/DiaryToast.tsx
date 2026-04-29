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
      window.setTimeout(onDismiss, 180);
    }, 2800);

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
            transform: translateY(12px);
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

        .reelshelf-toast-shell {
          position: absolute;
          inset: auto 0 max(16px, env(safe-area-inset-bottom, 0px) + 16px) 0;
          z-index: 70;
          display: flex;
          justify-content: flex-end;
          padding: 0 max(16px, env(safe-area-inset-right, 0px) + 16px) 0 max(16px, env(safe-area-inset-left, 0px) + 16px);
          pointer-events: none;
        }

        @media (max-width: 640px) {
          .reelshelf-toast-shell {
            justify-content: center;
          }
        }
      `}</style>
      <div className="reelshelf-toast-shell">
        <div
          style={{
            background: "rgba(15,15,30,0.96)",
            border: "0.5px solid rgba(255,255,255,0.1)",
            borderLeft: "2.5px solid #1D9E75",
            borderRadius: 10,
            padding: "13px 18px",
            fontSize: 13,
            maxWidth: 280,
            color: "rgba(255,255,255,0.85)",
            boxShadow: "0 18px 36px rgba(0,0,0,0.34)",
            animation: leaving
              ? "reelshelf-toast-out 180ms ease-in forwards"
              : "reelshelf-toast-in 220ms ease-out forwards",
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
