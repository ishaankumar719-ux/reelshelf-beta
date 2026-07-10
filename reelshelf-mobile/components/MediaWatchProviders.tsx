import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { TmdbProvider, TmdbWatchProviders } from '@/lib/tmdb';
import { getMediaKey } from '@/utils/listKeys';

interface MediaWatchProvidersProps {
  providers: TmdbWatchProviders;
}

function ProviderPill({ provider }: { provider: TmdbProvider }) {
  return (
    <View style={styles.pill}>
      {provider.logoUrl ? (
        <Image source={{ uri: provider.logoUrl }} style={styles.logo} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]} />
      )}
      <Text style={styles.pillLabel} numberOfLines={1}>{provider.name}</Text>
    </View>
  );
}

function ProviderGroup({ label, providers }: { label: string; providers: TmdbProvider[] }) {
  if (providers.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {providers.map(p => <ProviderPill key={getMediaKey('provider', p.id)} provider={p} />)}
      </View>
    </View>
  );
}

// Region is hardcoded to WATCH_PROVIDERS_REGION (US) — no user-location/region
// system exists in this app yet. Never fabricates providers: if TMDB returns
// nothing for the region, the exact fallback copy below is shown as-is.
export function MediaWatchProviders({ providers }: MediaWatchProvidersProps) {
  const isEmpty = providers.stream.length === 0 && providers.rent.length === 0 && providers.buy.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Availability not found yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProviderGroup label="Stream" providers={providers.stream} />
      <ProviderGroup label="Rent" providers={providers.rent} />
      <ProviderGroup label="Buy" providers={providers.buy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: RS.spacing.md,
    gap:               RS.spacing.sm,
  },
  group: {
    gap: RS.spacing.xs,
  },
  groupLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  pill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: 10,
    paddingVertical:   6,
    backgroundColor:   RS.colors.elevated,
    maxWidth:          160,
  },
  logo: {
    width:        20,
    height:       20,
    borderRadius: 5,
  },
  logoFallback: {
    backgroundColor: RS.colors.card,
  },
  pillLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  emptyText: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textMuted,
    fontStyle:  'italic',
  },
});
