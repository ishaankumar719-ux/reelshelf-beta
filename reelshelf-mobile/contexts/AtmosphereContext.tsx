import React, { createContext, useCallback, useContext, useState } from 'react';
import { dailyReelPick } from '@/data/seedHomeContent';

const FALLBACK_BASE: [string, string, string] = ['#1a1020', '#0f1a1a', '#0a0a12'];

interface AtmosphereValue {
  /** 2-3 dark hex colors from the Daily Reel pick, used as the base ambient gradient. */
  baseColors:       string[];
  /** Single hex color from the currently front-facing Collection poster, or null when not overriding. */
  overrideColor:    string | null;
  setOverrideColor: (color: string | null) => void;
}

const AtmosphereContext = createContext<AtmosphereValue>({
  baseColors:       dailyReelPick.dominantColors ?? FALLBACK_BASE,
  overrideColor:    null,
  setOverrideColor: () => {},
});

export function AtmosphereProvider({ children }: { children: React.ReactNode }) {
  const [overrideColor, setOverrideColorState] = useState<string | null>(null);

  const setOverrideColor = useCallback((color: string | null) => {
    setOverrideColorState(color);
  }, []);

  return (
    <AtmosphereContext.Provider
      value={{
        baseColors:    dailyReelPick.dominantColors ?? FALLBACK_BASE,
        overrideColor,
        setOverrideColor,
      }}
    >
      {children}
    </AtmosphereContext.Provider>
  );
}

export function useAtmosphere(): AtmosphereValue {
  return useContext(AtmosphereContext);
}
