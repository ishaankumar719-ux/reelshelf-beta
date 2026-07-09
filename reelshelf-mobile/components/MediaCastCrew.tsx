import { FlatList, type ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import { RS } from '@/constants/theme';
import { usePressLift } from '@/hooks/usePressLift';
import type { CastMember } from '@/data/mediaDetails';

const PHOTO_W = 84;
const PHOTO_H = 110;
const ITEM_W  = 96;
const ITEM_SEP = 12;

interface MediaCastCrewProps {
  cast:     CastMember[];
  director?: string | null;
  creator?:  string | null;
  writer?:   string | null;
  composer?: string | null;
}

// Reuses the shared press-lift primitive from Discover Phase 3 — no person
// detail screen exists yet, so this is press feedback only, no navigation.
function CastCard({ member }: { member: CastMember }) {
  const initial = member.name[0]?.toUpperCase() ?? '';
  const { style: animStyle, onPressIn, onPressOut } = usePressLift('lift');

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.castItem, animStyle]}>
        <View style={styles.photoOuter}>
          {member.photoUrl ? (
            <Image
              source={{ uri: member.photoUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.photoFallback]}>
              <Text style={styles.photoFallbackLetter}>{initial}</Text>
            </View>
          )}
        </View>
        <Text style={styles.castName} numberOfLines={2}>{member.name}</Text>
        {member.character ? (
          <Text style={styles.castCharacter} numberOfLines={2}>{member.character}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

type CrewLineProps = Pick<MediaCastCrewProps, 'director' | 'creator' | 'writer' | 'composer'>;

// Crew line — omits any field cleanly when not applicable (e.g. no composer for
// a book, no per-episode crew attribution for a TV series) rather than showing
// an empty label.
function CrewLine({ director, creator, writer, composer }: CrewLineProps) {
  const parts: string[] = [];
  if (director) parts.push(`Directed by ${director}`);
  if (creator) parts.push(`Created by ${creator}`);
  if (writer) parts.push(`Written by ${writer}`);
  if (composer) parts.push(`Music by ${composer}`);

  if (parts.length === 0) return null;

  return (
    <View style={styles.crewWrap}>
      {parts.map((line, i) => (
        <Text key={i} style={styles.crewLine}>{line}</Text>
      ))}
    </View>
  );
}

export function MediaCastCrew({ cast, director, creator, writer, composer }: MediaCastCrewProps) {
  const hasCrewLine = !!(director || creator || writer || composer);
  if (cast.length === 0 && !hasCrewLine) return null;

  return (
    <View style={styles.container}>
      <CrewLine director={director} creator={creator} writer={writer} composer={composer} />

      {cast.length > 0 && (
        <FlatList<CastMember>
          data={cast}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }: ListRenderItemInfo<CastMember>) => <CastCard member={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.sm,
  },
  crewWrap: {
    paddingHorizontal: RS.spacing.md,
    gap:               2,
  },
  crewLine: {
    fontSize:   RS.typography.caption + 1,
    fontWeight: '500',
    color:      RS.colors.textSecondary,
  },
  list: {
    paddingHorizontal: RS.spacing.md,
  },
  castItem: {
    width: ITEM_W,
    gap:   6,
  },
  photoOuter: {
    width:           PHOTO_W,
    height:          PHOTO_H,
    borderRadius:    RS.card.radius - 2,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
  },
  photoFallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  photoFallbackLetter: {
    fontSize:   28,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  castName: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
    lineHeight: 14,
  },
  castCharacter: {
    fontSize:   RS.typography.overline,
    color:      RS.colors.textMuted,
    lineHeight: 12,
  },
});
