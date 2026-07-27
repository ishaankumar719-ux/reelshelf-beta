// Deliberate mobile-only enhancement — see WEBSITE_ACHIEVEMENTS_AUDIT.md §5:
// the real website has no celebration UX at all for the generic badge sync
// (it runs inside a server component's data-fetch — a new badge just
// appears in the grid on next render) and only a small inline gold text
// banner for trivia unlocks specifically (no modal, no animation, no share
// anywhere). This global queue + modal is genuinely new mobile scope, not a
// port of anything real.
//
// Global (mounted once in app/_layout.tsx, alongside AuthProvider/
// SettingsProvider) so every evaluation trigger site — diary save, follow
// action, app-open catch-up — can call celebrateNewBadges() without each
// one owning its own modal state. Queues multiple simultaneous unlocks
// (e.g. crossing two count thresholds in one diary save) and reveals them
// one at a time rather than stacking modals.
import React, { createContext, useCallback, useContext, useState } from 'react';

import type { EarnedBadge } from '@/lib/supabase/badges';
import { BadgeUnlockModal } from '@/components/achievements/BadgeUnlockModal';

interface BadgeCelebrationValue {
  celebrateNewBadges: (badges: EarnedBadge[]) => void;
}

const BadgeCelebrationContext = createContext<BadgeCelebrationValue>({
  celebrateNewBadges: () => {},
});

export function useBadgeCelebration(): BadgeCelebrationValue {
  return useContext(BadgeCelebrationContext);
}

export function BadgeCelebrationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<EarnedBadge[]>([]);

  const celebrateNewBadges = useCallback((badges: EarnedBadge[]) => {
    if (badges.length === 0) return;
    setQueue((prev) => [...prev, ...badges]);
  }, []);

  const dismissCurrent = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const current = queue[0] ?? null;

  return (
    <BadgeCelebrationContext.Provider value={{ celebrateNewBadges }}>
      {children}
      {current ? <BadgeUnlockModal badge={current} onDismiss={dismissCurrent} /> : null}
    </BadgeCelebrationContext.Provider>
  );
}
