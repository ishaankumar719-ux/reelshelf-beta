import { useState } from 'react';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { RS } from '@/constants/theme';
import { pickAndUploadAvatar } from '@/lib/supabase/profile';

// Extracted from EditProfileModal.tsx (was inline JSX there) so onboarding's
// avatar step can reuse the exact same upload trigger/visual treatment
// rather than a second copy — EditProfileModal now renders this too,
// unchanged in behavior.
interface AvatarPickerProps {
  userId:    string;
  avatarUrl: string | null;
  onChange:  (url: string) => void;
  onError?:  (message: string) => void;
}

export function AvatarPicker({ userId, avatarUrl, onChange, onError }: AvatarPickerProps) {
  const [broken, setBroken] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePress = async () => {
    setUploading(true);
    const { url, error } = await pickAndUploadAvatar(userId);
    if (error) onError?.(error);
    if (url) { onChange(url); setBroken(false); }
    setUploading(false);
  };

  return (
    <Pressable
      style={styles.wrap}
      onPress={handlePress}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      accessibilityState={{ disabled: uploading, busy: uploading }}
    >
      {avatarUrl && !broken ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" onError={() => setBroken(true)} />
      ) : (
        <View style={[styles.avatar, styles.fallback]}>
          <MaterialIcons name="person" size={36} color={RS.colors.textMuted} />
        </View>
      )}
      <View style={styles.editBadge}>
        {uploading ? (
          <ActivityIndicator size="small" color={RS.colors.textPrimary} />
        ) : (
          <MaterialIcons name="camera-alt" size={14} color={RS.colors.textPrimary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
  },
  avatar: {
    width:        88,
    height:       88,
    borderRadius: 44,
  },
  fallback: {
    backgroundColor: RS.colors.elevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  editBadge: {
    position:        'absolute',
    right:           0,
    bottom:          0,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: RS.colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     RS.colors.card,
  },
});
