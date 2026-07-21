import { useState } from 'react';
import { FlatList, type ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';

import { FullCastModal } from '@/components/FullCastModal';
import { RS } from '@/constants/theme';
import { usePressLift } from '@/hooks/usePressLift';
import type { CastMember } from '@/data/mediaDetails';
import { getMediaKey } from '@/utils/listKeys';

const PHOTO_W = 84;
const PHOTO_H = 110;
const ITEM_W  = 96;
const ITEM_SEP = 12;

interface MediaCastCrewProps {
  cast:     CastMember[];
  /** Uncapped cast list for "View Full Cast" — absent (e.g. book seed data,
   *  which never carries a full-credits list) hides the trigger entirely. */
  fullCast?: CastMember[];
  director?: string | null;
  creator?:  string | null;
  writer?:   string | null;
  composer?: string | null;
  /** job === 'Director of Photography' — movie/TV only, absent for books. */
  cinematographer?: string | null;
  /** job === 'Producer' entries, joined for display — movie/TV only. */
  producers?: string[];
}

// A real Person Detail screen exists at app/person/[id].tsx — wired here so
// cast cards navigate, matching the website's cast → /people/[id] link.
function CastCard({ member }: { member: CastMember }) {
  const initial = member.name[0]?.toUpperCase() ?? '';
  const { style: animStyle, onPressIn, onPressOut } = usePressLift('lift');

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => member.personId && router.push(`/person/${member.personId}`)}
      disabled={!member.personId}
    >
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

type CrewLineProps = Pick<MediaCastCrewProps, 'director' | 'creator' | 'writer' | 'composer' | 'cinematographer' | 'producers'>;

// Crew line — omits any field cleanly when not applicable (e.g. no composer for
// a book, no per-episode crew attribution for a TV series) rather than showing
// an empty label.
function CrewLine({ director, creator, writer, composer, cinematographer, producers }: CrewLineProps) {
  const parts: string[] = [];
  if (director) parts.push(`Directed by ${director}`);
  if (creator) parts.push(`Created by ${creator}`);
  if (writer) parts.push(`Written by ${writer}`);
  if (cinematographer) parts.push(`Cinematography by ${cinematographer}`);
  if (composer) parts.push(`Music by ${composer}`);
  if (producers && producers.length > 0) parts.push(`Produced by ${producers.join(', ')}`);

  if (parts.length === 0) return null;

  return (
    <View style={styles.crewWrap}>
      {parts.map((line, i) => (
        <Text key={getMediaKey('crew-line', i)} style={styles.crewLine}>{line}</Text>
      ))}
    </View>
  );
}

export function MediaCastCrew({ cast, fullCast, director, creator, writer, composer, cinematographer, producers }: MediaCastCrewProps) {
  const [fullCastOpen, setFullCastOpen] = useState(false);
  const hasCrewLine = !!(director || creator || writer || composer || cinematographer || (producers && producers.length > 0));
  if (cast.length === 0 && !hasCrewLine) return null;

  // Only worth its own destination once there's meaningfully more to see than
  // the carousel already shows.
  const showFullCastLink = !!fullCast && fullCast.length > cast.length;

  return (
    <View style={styles.container}>
      <CrewLine
        director={director}
        creator={creator}
        writer={writer}
        composer={composer}
        cinematographer={cinematographer}
        producers={producers}
      />

      {cast.length > 0 && (
        <FlatList<CastMember>
          data={cast}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => getMediaKey('cast', `${item.name}-${index}`)}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }: ListRenderItemInfo<CastMember>) => <CastCard member={item} />}
        />
      )}

      {showFullCastLink && (
        <Pressable style={styles.fullCastBtn} onPress={() => setFullCastOpen(true)} hitSlop={6}>
          <Text style={styles.fullCastLabel}>View Full Cast ({fullCast!.length})</Text>
        </Pressable>
      )}

      {fullCast && (
        <FullCastModal visible={fullCastOpen} onClose={() => setFullCastOpen(false)} cast={fullCast} />
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
  fullCastBtn: {
    marginHorizontal: RS.spacing.md,
    alignSelf:        'flex-start',
  },
  fullCastLabel: {
    fontSize:      RS.typography.caption,
    fontWeight:    '700',
    color:         RS.colors.accent,
    letterSpacing: RS.letterSpacing.tight,
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
