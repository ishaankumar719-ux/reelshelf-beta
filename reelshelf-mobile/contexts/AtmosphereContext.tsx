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

interface AtmosphereProviderProps {
  children: React.ReactNode;
  /** Per-screen override for the base ambient palette (e.g. a Movie Detail item's
   *  own extracted dominant colors). Defaults to the Daily Reel pick, unchanged
   *  from the existing Home/Discover behaviour when omitted. */
  initialBaseColors?: string[];
}

export function AtmosphereProvider({ children, initialBaseColors }: AtmosphereProviderProps) {
  const [overrideColor, setOverrideColorState] = useState<string | null>(null);

  const setOverrideColor = useCallback((color: string | null) => {
    setOverrideColorState(color);
  }, []);

  const baseColors = (initialBaseColors && initialBaseColors.length > 0)
    ? initialBaseColors
    : (dailyReelPick.dominantColors ?? FALLBACK_BASE);

  return (
    <AtmosphereContext.Provider
      value={{
        baseColors,
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
