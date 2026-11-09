import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';

/** Bottom scroll padding so the last item can scroll fully above the docked
 *  tab bar. Inside the tabs this is the bar's real height (which already
 *  includes the home-indicator inset, so the inset isn't added twice); outside
 *  the tabs (root stack screens) it is just the inset. */
export function useTabBarClearance(extra: number = RS.spacing.lg) {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();
  return (tabBarHeight ?? insets.bottom) + extra;
}
