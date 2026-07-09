import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PosterCard } from '@/components/poster-card';
import { RS } from '@/constants/theme';
import { toDbMediaId, toDbMediaType } from '@/lib/supabase/mediaActions';
import type { Top4Item } from '@/lib/supabase/mountRushmore';
import {
  awardWinners, hiddenGems, randomDiscoveryPool, trendingToday, tvPicks,
  trendingBooks, awardWinnerBooks, type SeedCardItem,
} from '@/data/seedHomeContent';

interface Top4PickerProps {
  visible:  boolean;
  onClose:  () => void;
  onSave:   (items: Top4Item[]) => void;
  initial:  Top4Item[];
}

// Simple picker built from the app's existing curated seed pool (there is no
// live search screen yet — this reuses the same PosterCard grid pattern
// already used for browsing across Home/Discover, rather than a new
// interaction system). Tap up to 4 items in order to fill your Top 4.
function buildPool(): SeedCardItem[] {
  const all = [...trendingToday, ...hiddenGems, ...awardWinners, ...tvPicks, ...randomDiscoveryPool, ...trendingBooks, ...awardWinnerBooks];
  const seen = new Set<string>();
  return all.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const POOL = buildPool();

export function Top4Picker({ visible, onClose, onSave, initial }: Top4PickerProps) {
  const [selected, setSelected] = useState<SeedCardItem[]>(() =>
    initial.map((i) => POOL.find((p) => toDbMediaId(p.id) === i.mediaId) ?? null).filter((x): x is SeedCardItem => !!x)
  );

  const toggle = (item: SeedCardItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) return prev.filter((p) => p.id !== item.id);
      if (prev.length >= 4) return prev;
      return [...prev, item];
    });
  };

  const handleSave = () => {
    const items: Top4Item[] = selected.slice(0, 4).map((item, i) => ({
      position:   i + 1,
      mediaId:    toDbMediaId(item.id),
      mediaType:  toDbMediaType(item.mediaType),
      title:      item.title,
      year:       String(item.year),
      posterPath: item.posterUrl,
    }));
    onSave(items);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={RS.colors.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle}>Choose Your Top 4</Text>
            <Pressable onPress={handleSave} hitSlop={8}>
              <Text style={styles.saveLabel}>Save</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{selected.length} / 4 selected</Text>

          <FlatList<SeedCardItem>
            data={POOL}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => {
              const isSelected = selected.some((p) => p.id === item.id);
              const order = selected.findIndex((p) => p.id === item.id) + 1;
              return (
                <Pressable style={styles.gridItem} onPress={() => toggle(item)}>
                  <PosterCard title={item.title} year={item.year} mediaType={item.mediaType} posterUrl={item.posterUrl} width={100} height={150} />
                  {isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>{order}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'flex-end',
  },
  sheet: {
    height:               '85%',
    borderTopLeftRadius:  RS.card.radius + 8,
    borderTopRightRadius: RS.card.radius + 8,
    overflow:             'hidden',
    backgroundColor:      RS.colors.card,
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: RS.spacing.md,
    paddingTop:        RS.spacing.md,
    paddingBottom:     RS.spacing.xs,
  },
  headerTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
  },
  saveLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '700',
    color:      RS.colors.accent,
  },
  subtitle: {
    fontSize:          RS.typography.caption,
    color:             RS.colors.textMuted,
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.sm,
  },
  grid: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.xl,
  },
  gridRow: {
    gap: RS.spacing.sm,
  },
  gridItem: {
    marginBottom: RS.spacing.sm,
  },
  selectedBadge: {
    position:        'absolute',
    top:              6,
    right:            6,
    width:            22,
    height:           22,
    borderRadius:     11,
    backgroundColor:  RS.colors.accent,
    alignItems:       'center',
    justifyContent:   'center',
  },
  selectedBadgeText: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      '#fff',
  },
});
