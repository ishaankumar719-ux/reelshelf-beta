import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { AmbientAtmosphere } from '@/components/AmbientAtmosphere';
import { CollectionPreviewCard } from '@/components/CollectionPreviewCard';
import { ExpandEntrance } from '@/components/ExpandEntrance';
import { MediaCastCrew } from '@/components/MediaCastCrew';
import { MediaHero } from '@/components/MediaHero';
import { MediaPrimaryActions } from '@/components/MediaPrimaryActions';
import { MediaSynopsis } from '@/components/MediaSynopsis';
import { RevealOnMount } from '@/components/RevealOnMount';
import { SectionHeader } from '@/components/section-header';
import { AtmosphereProvider } from '@/contexts/AtmosphereContext';
import { RS } from '@/constants/theme';
import { collections, type MediaType } from '@/data/seedHomeContent';
import { mediaDetails } from '@/data/mediaDetails';

export default function MediaDetailScreen() {
  const { id, title, posterUrl, mediaType } = useLocalSearchParams<{
    id:        string;
    title:     string;
    posterUrl: string;
    mediaType: string;
    expand?:   string;
  }>();

  const detail = mediaDetails[id];
  const memberCollections = collections.filter(c => c.items.some(i => i.id === id));

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY   = useScrollViewOffset(scrollRef);

  return (
    <AtmosphereProvider initialBaseColors={detail?.dominantColors}>
      <View style={styles.screen}>
        <AmbientAtmosphere scrollY={scrollY} />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <MaterialIcons name="arrow-back" size={20} color={RS.colors.textPrimary} />
          </Pressable>

          <Animated.ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.content}
          >
            <ExpandEntrance active>
              <View style={styles.sections}>
                <MediaHero
                  title={title ?? '—'}
                  year={detail?.year}
                  mediaType={(mediaType as MediaType) ?? 'film'}
                  posterUrl={posterUrl || null}
                  detail={detail}
                />

                <RevealOnMount delay={60}>
                  <MediaPrimaryActions title={title ?? ''} synopsis={detail?.synopsis} />
                </RevealOnMount>

                {detail?.synopsis ? (
                  <RevealOnMount delay={100}>
                    <MediaSynopsis synopsis={detail.synopsis} />
                  </RevealOnMount>
                ) : null}

                {detail && (detail.cast.length > 0 || detail.director || detail.creator || detail.writer || detail.composer) ? (
                  <RevealOnMount delay={140}>
                    <View style={styles.section}>
                      <SectionHeader title="Cast & Crew" />
                      <MediaCastCrew
                        cast={detail.cast}
                        director={detail.director}
                        creator={detail.creator}
                        writer={detail.writer}
                        composer={detail.composer}
                      />
                    </View>
                  </RevealOnMount>
                ) : null}

                {memberCollections.length > 0 ? (
                  <RevealOnMount delay={180}>
                    <View style={styles.section}>
                      <SectionHeader
                        eyebrow="Collections"
                        title="Belongs To"
                        subtitle="Part of these curated shelves."
                      />
                      <Animated.ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.collectionsList}
                      >
                        {memberCollections.map((c, i) => (
                          <View key={c.id} style={i > 0 ? { marginLeft: 12 } : undefined}>
                            <CollectionPreviewCard item={c} />
                          </View>
                        ))}
                      </Animated.ScrollView>
                    </View>
                  </RevealOnMount>
                ) : null}
              </View>
            </ExpandEntrance>
          </Animated.ScrollView>
        </SafeAreaView>
      </View>
    </AtmosphereProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: RS.colors.base,
  },
  safeArea: {
    flex:            1,
    backgroundColor: 'transparent',
  },
  backButton: {
    position:       'absolute',
    top:            RS.spacing.sm,
    left:           RS.spacing.md,
    zIndex:         10,
    width:          36,
    height:         36,
    borderRadius:   18,
    overflow:       'hidden',
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    0.5,
    borderColor:    'rgba(255,255,255,0.14)',
  },
  content: {
    paddingBottom: RS.tabBar.contentBottomPad,
  },
  sections: {
    gap: RS.spacing.xxl,
  },
  section: {
    gap: RS.spacing.sm,
  },
  collectionsList: {
    paddingHorizontal: RS.spacing.md,
  },
});
