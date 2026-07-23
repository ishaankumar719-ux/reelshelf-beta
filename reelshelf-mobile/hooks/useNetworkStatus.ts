import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** True only when we're confident there's no usable connection — starts
 *  optimistic (assumes online) so cold start never flashes an offline banner
 *  before NetInfo's first real reading arrives. `isInternetReachable` can be
 *  null while NetInfo is still determining reachability; only treat it as
 *  offline once it's explicitly false, paired with isConnected === false. */
export function useNetworkStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  return { isOffline };
}
