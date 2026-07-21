import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';
import type { CastMember } from '@/data/mediaDetails';
import { getMediaKey } from '@/utils/listKeys';

interface FullCastModalProps {
  visible: boolean;
  onClose: () => void;
  cast:    CastMember[];
}

// TMDB's /credits endpoint already returns the complete cast list in the same
// call MediaCastCrew's top-12 carousel uses (see lib/tmdb.ts fetchTmdbCredits
// — `fullCast` is the same response, unsliced), so this modal costs no extra
// network request. Same bottom-sheet Modal pattern as FollowListModal.tsx —
// the established precedent for "list of people, each tappable to a profile."
export function FullCastModal({ visible, onClose, cast }: FullCastModalProps) {
  const handleTap = (personId: number | null | undefined) => {
    if (!personId) return;
    onClose();
    router.push(`/person/${personId}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <Text style={styles.title}>Full Cast</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={RS.colors.textSecondary} />
            </Pressable>
          </View>

          {cast.length === 0 ? (
            <Text style={styles.emptyText}>No cast information available.</Text>
          ) : (
            <FlatList
              data={cast}
              keyExtractor={(item, index) => getMediaKey('full-cast', `${item.personId ?? item.name}-${index}`)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const initial = item.name[0]?.toUpperCase() ?? '';
                return (
                  <Pressable
                    style={styles.row}
                    onPress={() => handleTap(item.personId)}
                    disabled={!item.personId}
                  >
                    {item.photoUrl ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.photo} contentFit="cover" transition={150} />
                    ) : (
                      <View style={[styles.photo, styles.photoFallback]}>
                        <Text style={styles.photoFallbackLetter}>{initial}</Text>
                      </View>
                    )}
                    <View style={styles.rowMeta}>
                      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                      {item.character ? (
                        <Text style={styles.character} numberOfLines={1}>{item.character}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { height: '75%', borderTopLeftRadius: RS.card.radius + 8, borderTopRightRadius: RS.card.radius + 8, overflow: 'hidden', backgroundColor: RS.colors.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: RS.spacing.md, paddingTop: RS.spacing.md, paddingBottom: RS.spacing.sm },
  title: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  emptyText: { fontSize: RS.typography.body, color: RS.colors.textMuted, textAlign: 'center', marginTop: RS.spacing.xl, fontStyle: 'italic' },
  list: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm, paddingVertical: RS.spacing.sm },
  photo: { width: 44, height: 44, borderRadius: 22 },
  photoFallback: { backgroundColor: RS.colors.elevated, alignItems: 'center', justifyContent: 'center' },
  photoFallbackLetter: { fontSize: 16, fontWeight: '700', color: RS.colors.textMuted },
  rowMeta: { flex: 1, gap: 1 },
  name: { fontSize: RS.typography.body, fontWeight: '600', color: RS.colors.textPrimary },
  character: { fontSize: RS.typography.caption, color: RS.colors.textMuted },
});
