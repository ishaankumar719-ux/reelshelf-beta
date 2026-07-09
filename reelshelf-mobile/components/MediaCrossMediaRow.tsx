import { StyleSheet, View } from 'react-native';

import { MediaPosterRow } from '@/components/MediaPosterRow';
import { SectionHeader } from '@/components/section-header';
import { RS } from '@/constants/theme';
import { crossMediaRelated } from '@/data/relatedStoriesSeed';

// Fully functional container for an editorially-curated cross-media row
// (e.g. "books with a similar theme" alongside a film). crossMediaRelated is
// empty today, so this renders nothing — see data/relatedStoriesSeed.ts for
// why that's a deliberate, flagged decision rather than an oversight.
export function MediaCrossMediaRow({ id }: { id: string }) {
  const entry = crossMediaRelated[id];
  if (!entry || entry.items.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader eyebrow="Related Stories" title={entry.label} />
      <MediaPosterRow items={entry.items} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: RS.spacing.sm,
  },
});
