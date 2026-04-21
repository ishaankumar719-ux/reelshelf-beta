"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import DiaryLogModal from "../components/diary/DiaryLogModal";
import DiaryToast from "../components/diary/DiaryToast";
import type { DiaryEntry, LogMediaInput } from "../types/diary";

interface DiaryLogContextValue {
  isOpen: boolean;
  media: LogMediaInput | null;
  toastMessage: string | null;
  openLog: (media: LogMediaInput) => void;
  closeLog: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
}

const DiaryLogContext = createContext<DiaryLogContextValue | null>(null);

export function DiaryLogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<LogMediaInput | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const value = useMemo<DiaryLogContextValue>(
    () => ({
      isOpen,
      media,
      toastMessage,
      openLog: (nextMedia) => {
        setMedia(nextMedia);
        setIsOpen(true);
      },
      closeLog: () => setIsOpen(false),
      showToast: (message) => setToastMessage(message),
      dismissToast: () => setToastMessage(null),
    }),
    [isOpen, media, toastMessage]
  );

  return (
    <DiaryLogContext.Provider value={value}>
      {children}
      {isOpen && media ? (
        <DiaryLogModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSaved={(entry: DiaryEntry, streak: number) => {
            setIsOpen(false);
            setToastMessage(
              streak > 1
                ? `🔥 ${entry.title} logged · ${streak} day streak`
                : `✓ ${entry.title} logged to your ReelShelf`
            );
          }}
          media={media}
        />
      ) : null}
      {toastMessage ? (
        <DiaryToast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      ) : null}
    </DiaryLogContext.Provider>
  );
}

export function useDiaryLog() {
  const context = useContext(DiaryLogContext);

  if (!context) {
    throw new Error("useDiaryLog must be used within DiaryLogProvider");
  }

  return context;
}
