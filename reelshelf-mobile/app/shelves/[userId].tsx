// Someone else's shelves: their public watchlist / TV / reading shelves and public lists.
// Unlisted and private shelves never appear here (profile_shelves + get_shelf_items).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShelfBrowser } from '@/components/shelves/ShelfBrowser';
import { SkeletonBlock } from '@/components/Skeleton';
import { RS } from '@/constants/theme';
import { loadProfileShelves, type Shelf } from '@/lib/supabase/shelves';

export default function UserShelvesScreen() {
  const { userId, name } = useLocalSearchParams<{ userId: string; name?: string }>();
  const [shelves, setShelves] = useState<Shelf[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadProfileShelves(userId)
      .then((s) => live && setShelves(s))
      .catch(() => live && setError("Couldn't load these shelves."));
    return () => {
      live = false;
    };
  }, [userId]);

  const title = name ? `${name}’s shelves` : 'Shelves';

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backGlyph}>‹</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {shelves === null ? (
        <View>
          {header}
          {error ? (
            <Text style={styles.message} accessibilityRole="alert">{error}</Text>
          ) : (
            [0, 1, 2].map((i) => <SkeletonBlock key={i} height={200} radius={6} style={{ marginHorizontal: RS.spacing.md, marginBottom: 22 }} />)
          )}
        </View>
      ) : shelves.length === 0 ? (
        <View>
          {header}
          <Text style={styles.message}>No public shelves yet.</Text>
        </View>
      ) : (
        <ShelfBrowser shelves={shelves} canEdit={false} header={header} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RS.colors.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: RS.spacing.sm, paddingTop: 4, paddingBottom: 14 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 32, color: RS.colors.textPrimary, lineHeight: 34 },
  title: { flex: 1, fontSize: 24, fontWeight: '700', color: RS.colors.textPrimary, letterSpacing: -0.3 },
  message: { marginHorizontal: RS.spacing.md, fontSize: 14, color: RS.colors.textSecondary },
});
