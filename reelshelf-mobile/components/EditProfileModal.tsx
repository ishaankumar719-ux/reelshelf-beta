import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RS } from '@/constants/theme';
import { pickAndUploadAvatar, updateProfile, type ProfileData } from '@/lib/supabase/profile';

interface EditProfileModalProps {
  visible:  boolean;
  onClose:  () => void;
  onSaved:  () => void;
  profile:  ProfileData;
}

// Bio cap chosen at 240 chars — mid-range of the brief's suggested 160-300,
// long enough for a real bio, short enough to stay a profile blurb rather
// than a review.
const BIO_MAX = 240;

const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Animation', 'Thriller',
  'Romance', 'Action', 'Documentary', 'Fantasy', 'Mystery', 'Adventure', 'Crime',
] as const;

export function EditProfileModal({ visible, onClose, onSaved, profile }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [username, setUsername] = useState(profile.username ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? '');
  const [genres, setGenres] = useState<string[]>(profile.favouriteGenres);
  const [favFilm, setFavFilm] = useState(profile.favouriteFilm ?? '');
  const [favSeries, setFavSeries] = useState(profile.favouriteSeries ?? '');
  const [favBook, setFavBook] = useState(profile.favouriteBook ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDisplayName(profile.displayName ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setWebsiteUrl(profile.websiteUrl ?? '');
    setGenres(profile.favouriteGenres);
    setFavFilm(profile.favouriteFilm ?? '');
    setFavSeries(profile.favouriteSeries ?? '');
    setFavBook(profile.favouriteBook ?? '');
    setAvatarUrl(profile.avatarUrl);
    setError(null);
  }, [visible, profile]);

  const toggleGenre = (genre: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const handleChangeAvatar = async () => {
    setUploadingAvatar(true);
    setError(null);
    const { url, error: uploadError } = await pickAndUploadAvatar(profile.id);
    if (uploadError) setError(uploadError);
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: saveError } = await updateProfile(profile.id, {
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      websiteUrl: websiteUrl.trim(),
      favouriteGenres: genres,
      favouriteFilm: favFilm.trim(),
      favouriteSeries: favSeries.trim(),
      favouriteBook: favBook.trim(),
    });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <View style={styles.grabber} />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.headerTitle}>Edit Profile</Text>

              <Pressable style={styles.avatarWrap} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <MaterialIcons name="person" size={36} color={RS.colors.textMuted} />
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color={RS.colors.textPrimary} />
                  ) : (
                    <MaterialIcons name="camera-alt" size={14} color={RS.colors.textPrimary} />
                  )}
                </View>
              </Pressable>

              <View style={styles.field}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={RS.colors.textMuted} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  placeholderTextColor={RS.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Bio</Text>
                  <Text style={styles.counter}>{bio.length} / {BIO_MAX}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
                  placeholder="A few words about you…"
                  placeholderTextColor={RS.colors.textMuted}
                  multiline
                  maxLength={BIO_MAX}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://"
                  placeholderTextColor={RS.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Favourite Genres</Text>
                <View style={styles.genreGrid}>
                  {GENRE_OPTIONS.map((genre) => {
                    const active = genres.includes(genre);
                    return (
                      <Pressable key={genre} style={[styles.genreChip, active && styles.genreChipActive]} onPress={() => toggleGenre(genre)}>
                        <Text style={[styles.genreLabel, active && styles.genreLabelActive]}>{genre}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Favourite Film</Text>
                <TextInput style={styles.input} value={favFilm} onChangeText={setFavFilm} placeholder="e.g. Oppenheimer" placeholderTextColor={RS.colors.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Favourite Series</Text>
                <TextInput style={styles.input} value={favSeries} onChangeText={setFavSeries} placeholder="e.g. The Bear" placeholderTextColor={RS.colors.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Favourite Book</Text>
                <TextInput style={styles.input} value={favBook} onChangeText={setFavBook} placeholder="e.g. Dune" placeholderTextColor={RS.colors.textMuted} />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={RS.button.filledText} /> : <Text style={styles.saveBtnLabel}>Save</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent:  'flex-end',
  },
  sheet: {
    maxHeight:            '90%',
    borderTopLeftRadius:  RS.card.radius + 8,
    borderTopRightRadius: RS.card.radius + 8,
    overflow:             'hidden',
    backgroundColor:      RS.colors.card,
    borderWidth:          0.5,
    borderColor:          RS.glass.border,
    borderBottomWidth:    0,
  },
  grabber: {
    alignSelf:       'center',
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginTop:       RS.spacing.sm,
    marginBottom:    RS.spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.xl,
    gap:               RS.spacing.md,
  },
  headerTitle: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    textAlign:     'center',
    marginBottom:  RS.spacing.xs,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: RS.spacing.sm,
  },
  avatar: {
    width:        88,
    height:       88,
    borderRadius: 44,
  },
  avatarFallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarEditBadge: {
    position:        'absolute',
    right:            0,
    bottom:           0,
    width:            28,
    height:           28,
    borderRadius:     14,
    backgroundColor:  RS.colors.accent,
    alignItems:       'center',
    justifyContent:   'center',
    borderWidth:      2,
    borderColor:      RS.colors.card,
  },
  field: {
    gap: RS.spacing.xs,
  },
  labelRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize:      RS.typography.caption,
    fontWeight:    '600',
    color:         RS.colors.textSecondary,
  },
  counter: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
  input: {
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.sm,
    fontSize:          RS.typography.body,
    color:             RS.colors.textPrimary,
  },
  bioInput: {
    minHeight:         70,
    textAlignVertical: 'top',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           RS.spacing.xs + 2,
  },
  genreChip: {
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: 12,
    paddingVertical:   7,
    backgroundColor:   RS.colors.elevated,
  },
  genreChipActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
  },
  genreLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  genreLabelActive: {
    color: RS.button.primaryText,
  },
  errorText: {
    fontSize: RS.typography.caption + 1,
    color:    '#f87171',
  },
  actions: {
    flexDirection: 'row',
    gap:           RS.spacing.sm,
    marginTop:     RS.spacing.xs,
  },
  cancelBtn: {
    flex:              1,
    borderRadius:      RS.button.radius,
    borderWidth:       1,
    borderColor:       RS.button.secondaryBorder,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  cancelLabel: {
    fontSize:   RS.typography.body,
    fontWeight: '600',
    color:      RS.button.secondaryText,
  },
  saveBtn: {
    flex:              2,
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingVertical:   RS.button.paddingV,
    alignItems:        'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
