import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RS } from '@/constants/theme';
import { fitMedia, formatDuration, type GifAttachment } from '@/lib/messaging/api';

type Source = { uri: string; headers?: Record<string, string> };

const MAX_W = 250;
const MAX_H = 300;

export function GifView({ gif }: { gif: GifAttachment }) {
  const box = fitMedia(gif.width, gif.height, 220, 220);
  return (
    <View style={[styles.frame, box]} accessible accessibilityRole="image" accessibilityLabel={gif.title ? `GIF: ${gif.title}` : 'GIF'}>
      <Image source={{ uri: gif.url }} style={StyleSheet.absoluteFill} contentFit="cover" autoplay />
      <Text style={styles.badge}>GIF</Text>
    </View>
  );
}

export function PhotoView({ source, width, height, onOpen, onLongPress }: {
  source: Source | null; width: number | null; height: number | null; onOpen?: () => void; onLongPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const box = fitMedia(width, height, MAX_W, MAX_H);
  return (
    <Pressable onPress={onOpen} onLongPress={onLongPress} delayLongPress={350} disabled={!onOpen && !onLongPress}
      accessibilityRole={onOpen ? 'imagebutton' : 'image'} accessibilityLabel={onOpen ? 'Photo. Opens full screen' : 'Photo'}
      style={[styles.frame, box]}>
      {source && !failed ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} onError={() => setFailed(true)} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={styles.unavailable}>{failed ? 'Photo unavailable' : ''}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Poster with a play button and length; tap opens the player. */
export function VideoThumb({ poster, width, height, durationMs, onPlay, onLongPress }: {
  poster: Source | null; width: number | null; height: number | null; durationMs: number | null;
  onPlay?: () => void; onLongPress?: () => void;
}) {
  const box = fitMedia(width, height, MAX_W, MAX_H);
  return (
    <Pressable onPress={onPlay} onLongPress={onLongPress} delayLongPress={350} disabled={!onPlay && !onLongPress}
      accessibilityRole="button" accessibilityLabel={`Play video${durationMs != null ? `, ${formatDuration(durationMs)}` : ''}`}
      style={[styles.frame, box, { backgroundColor: '#000' }]}>
      {poster ? <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : null}
      {onPlay ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <View style={styles.play}><MaterialIcons name="play-arrow" size={30} color="#fff" /></View>
        </View>
      ) : null}
      {durationMs != null ? <Text style={[styles.badge, { left: undefined, right: 8 }]}>{formatDuration(durationMs)}</Text> : null}
    </Pressable>
  );
}

/** Full-screen photo. */
export function PhotoViewer({ source, onClose }: { source: Source | null; onClose: () => void }) {
  return (
    <Modal visible={!!source} animationType="fade" onRequestClose={onClose} presentationStyle="overFullScreen" transparent>
      <SafeAreaView style={styles.viewer}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo" style={styles.close} hitSlop={8}>
          <MaterialIcons name="close" size={26} color="#fff" />
        </Pressable>
        {source ? <Image source={source} style={{ flex: 1 }} contentFit="contain" /> : null}
      </SafeAreaView>
    </Modal>
  );
}

/** Full-screen player with the system playback controls. */
export function VideoPlayerModal({ source, onClose }: { source: Source | null; onClose: () => void }) {
  return (
    <Modal visible={!!source} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.viewer}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close video" style={styles.close} hitSlop={8}>
          <MaterialIcons name="close" size={26} color="#fff" />
        </Pressable>
        {source ? <Player source={source} /> : null}
      </SafeAreaView>
    </Modal>
  );
}

function Player({ source }: { source: Source }) {
  const player = useVideoPlayer({ uri: source.uri, headers: source.headers }, (p) => { p.play(); });
  return <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="contain" allowsFullscreen />;
}

const styles = StyleSheet.create({
  frame: { borderRadius: 16, overflow: 'hidden', backgroundColor: RS.colors.elevated },
  center: { alignItems: 'center', justifyContent: 'center' },
  unavailable: { color: RS.colors.textSecondary, fontSize: 13 },
  badge: {
    position: 'absolute', left: 8, bottom: 8, overflow: 'hidden', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: 'rgba(7,7,7,0.7)', color: '#fff', fontSize: 11, fontWeight: '700',
  },
  play: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(7,7,7,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute', top: 54, right: 16, zIndex: 2, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
  },
});
