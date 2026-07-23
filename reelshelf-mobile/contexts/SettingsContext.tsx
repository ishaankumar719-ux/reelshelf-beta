// Local device settings — currently just the Ambient Effects toggle (Settings
// > Appearance). Mobile's ambient system (AtmosphereContext/AmbientAtmosphere)
// is a generic extracted-dominant-color gradient, not the real website's
// bespoke per-title "Easter Eggs" (32 hand-curated particle themes — Dune's
// spice motes, Spider-Man's web strands, etc., confirmed via
// app/settings/appearance/page.tsx). Building 32 bespoke effects is out of
// scope for a Settings screen; this toggle is the honest, narrowly-scoped
// mobile equivalent — same idea (ambient effects on/off), simpler
// implementation. No intensity selector: mobile only has one visual
// intensity today, unlike the website's Full/Subtle.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'reelshelf:ambientEffectsEnabled';

interface SettingsValue {
  ambientEffectsEnabled: boolean;
  setAmbientEffectsEnabled: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsValue>({
  ambientEffectsEnabled: true,
  setAmbientEffectsEnabled: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ambientEffectsEnabled, setEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw !== null) setEnabledState(raw === 'true');
    });
  }, []);

  const setAmbientEffectsEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  return (
    <SettingsContext.Provider value={{ ambientEffectsEnabled, setAmbientEffectsEnabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
