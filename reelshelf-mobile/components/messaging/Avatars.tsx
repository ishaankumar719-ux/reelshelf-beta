import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { RS } from '@/constants/theme';

export function Avatar({ url, name, size = 44 }: { url: string | null; name: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text style={styles.avatarInitial}>{name.replace(/^@/, '').charAt(0).toUpperCase() || '?'}</Text>
      )}
    </View>
  );
}

export function GroupGlyph({ size = 44 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <MaterialIcons name="group" size={size * 0.5} color={RS.colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: RS.colors.elevated, borderWidth: 1, borderColor: RS.colors.border,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarInitial: { color: RS.colors.textSecondary, fontWeight: '600', fontSize: 16 },
});
