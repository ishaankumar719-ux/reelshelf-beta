import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Shared Reduce Motion flag — used by any new animation (Phase 3 discover polish)
// to provide an instant/non-animated fallback.
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  return reduceMotion;
}
