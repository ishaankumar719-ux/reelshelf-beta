// Settings — built from a direct audit of the real website (grep across
// app/, components/, src/ for "Privacy Policy"/"Terms"/mailto/support email:
// zero matches anywhere — the website has none of these, so mobile doesn't
// either, per CONSTRAINTS "do not invent"). The one real website Settings
// page confirmed to have content is app/settings/appearance/page.tsx
// (Easter Eggs — see contexts/SettingsContext.tsx for the mobile-equivalent
// decision). profiles.is_public is real (src/components/profile/
// ProfileEditor.tsx on the website) but mobile's own EditProfileModal.tsx
// does not yet expose it — a pre-existing gap, unrelated to this screen —
// so Settings is currently mobile's only UI for that column.
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchIsPublic, updateIsPublic } from '@/lib/supabase/profile';

const WEBSITE_URL = 'https://reelshelf.app';
// Confirmed via full-text search of app/, components/, src/ — the real
// website has no Privacy Policy page, no Terms of Service page, and no
// public support/contact email anywhere in its source. Nothing to link to;
// omitted rather than invented (see RETURN's SECTIONS_EXCLUDED).

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label, sublabel, onPress, right, destructive,
}: {
  label: string; sublabel?: string; onPress?: () => void; right?: React.ReactNode; destructive?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress ? <MaterialIcons name="chevron-right" size={20} color={RS.colors.textMuted} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { ambientEffectsEnabled, setAmbientEffectsEnabled } = useSettings();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchIsPublic(user.id).then(setIsPublic).catch(() => setIsPublic(true));
  }, [user]);

  const handleTogglePublic = async (next: boolean) => {
    if (!user) return;
    setIsPublic(next); // optimistic — single source of truth is the DB column itself
    const { error } = await updateIsPublic(user.id, next);
    if (error) setIsPublic(!next); // revert on failure
  };

  const handleLogOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const appVersion = Constants.expoConfig?.version ?? '—';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={RS.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Account">
          <Row label="Edit Profile" onPress={() => router.push('/(tabs)/profile?edit=1')} />
          <Row label="Log Out" onPress={handleLogOut} />
          <Row label="Delete Account" destructive onPress={() => router.push('/settings/delete-account')} />
        </Section>

        <Section title="Privacy">
          <Row
            label="Public Profile"
            sublabel={isPublic === false ? 'Your profile is only visible to people you approve.' : 'Anyone can view your profile.'}
            right={
              isPublic === null
                ? <ActivityIndicator size="small" color={RS.colors.textMuted} />
                : <Switch value={isPublic} onValueChange={handleTogglePublic} trackColor={{ true: RS.colors.accent }} />
            }
          />
        </Section>

        <Section title="Appearance">
          <Row
            label="Ambient Effects"
            sublabel="Subtle background atmosphere on Home, Discover, and Detail screens."
            right={<Switch value={ambientEffectsEnabled} onValueChange={setAmbientEffectsEnabled} trackColor={{ true: RS.colors.accent }} />}
          />
        </Section>

        <Section title="Support">
          <Row label="Report a Bug" onPress={() => router.push('/settings/report-bug')} />
        </Section>

        <Section title="About">
          <Row label="Version" sublabel={`${appVersion} (${buildNumber})`} />
          <Row label="reelshelf.app" onPress={() => Linking.openURL(WEBSITE_URL).catch(() => {})} />
          <View style={styles.ackBlock}>
            <Text style={styles.ackTitle}>Acknowledgements</Text>
            <Text style={styles.ackText}>
              Movie and TV data from TMDB. Book data from Google Books. GIFs from GIPHY. Backend by Supabase.
            </Text>
            <Text style={styles.ackText}>This product uses the TMDB API but is not endorsed or certified by TMDB.</Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RS.colors.base },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: RS.spacing.md, paddingVertical: RS.spacing.sm,
  },
  headerTitle: { fontSize: RS.typography.subheading, fontWeight: '700', color: RS.colors.textPrimary },
  content: { padding: RS.spacing.md, paddingBottom: RS.spacing.xxl, gap: RS.spacing.lg },
  section: { gap: RS.spacing.xs },
  sectionTitle: {
    fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: RS.letterSpacing.wide, marginLeft: RS.spacing.xs,
  },
  sectionBody: {
    backgroundColor: RS.colors.card, borderRadius: 14, borderWidth: 0.5, borderColor: RS.colors.border, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: RS.spacing.sm,
    paddingHorizontal: RS.spacing.md, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: RS.colors.border,
  },
  rowLabel: { fontSize: RS.typography.body, color: RS.colors.textPrimary, fontWeight: '500' },
  rowLabelDestructive: { color: '#f87171' },
  rowSublabel: { fontSize: RS.typography.caption, color: RS.colors.textMuted, marginTop: 2 },
  ackBlock: { padding: RS.spacing.md, gap: RS.spacing.xs },
  ackTitle: { fontSize: RS.typography.caption, fontWeight: '700', color: RS.colors.textSecondary },
  ackText: { fontSize: RS.typography.caption, color: RS.colors.textMuted, lineHeight: 16 },
});
