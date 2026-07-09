import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, FlatList, type ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { SectionHeader } from '@/components/section-header';
import { RS, Fonts } from '@/constants/theme';
import { usePressLift } from '@/hooks/usePressLift';
import { useExpandOnPress } from '@/hooks/useExpandOnPress';
import {
  bookOfTheMonth,
  trendingBooks,
  awardWinnerBooks,
  type SeedBookItem,
} from '@/data/seedHomeContent';

function bookHref(item: SeedBookItem, expand?: boolean): `/media/${string}` {
  const base = `/media/${item.id}?title=${encodeURIComponent(item.title)}&posterUrl=${encodeURIComponent(item.posterUrl ?? '')}&mediaType=book`;
  return (expand ? `${base}&expand=1` : base) as `/media/${string}`;
}

// ── Book cover card (reusable for Trending + Award Winners FlatLists) ─────────
const BOOK_W  = 140;
const BOOK_H  = 210;    // generous — books should not feel secondary
const ITEM_SEP = 14;

function BookCoverCard({ item }: { item: SeedBookItem }) {
  const initial = item.title[0]?.toUpperCase() ?? '';
  const { style: animStyle, onPressIn, onPressOut } = usePressLift('lift');

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(bookHref(item));
  };

  return (
    <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.bookOuter, animStyle]}>
      <View style={[styles.bookInner, { width: BOOK_W, height: BOOK_H }]}>
        {item.posterUrl ? (
          <Image
            source={{ uri: item.posterUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <LinearGradient
            colors={['#1a1206', '#0e0e1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.bookFallback]}
          >
            <Text style={styles.bookInitial}>{initial}</Text>
          </LinearGradient>
        )}

        {/* Gradient scrim */}
        {item.posterUrl && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.68)', 'rgba(0,0,0,0.94)']}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}

        {/* BOOK badge */}
        <View style={[styles.bookBadge, { backgroundColor: RS.badge.book.bg }]}>
          <Text style={[styles.bookBadgeLabel, { color: RS.badge.book.text }]}>BOOK</Text>
        </View>

        <View style={styles.bookFooter}>
          <Text style={styles.bookTitle} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
        </View>
      </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Book of the Month — full-width featured panel ─────────────────────────────
const FEATURED_W = Dimensions.get('window').width - 2 * RS.spacing.md;
const FEATURED_H = 220;

function BookOfTheMonthPanel() {
  const initial = bookOfTheMonth.title[0]?.toUpperCase() ?? '';
  const { style: liftStyle, onPressIn, onPressOut } = usePressLift('depress');

  const navigate = () => router.push(bookHref(bookOfTheMonth, true));
  const { style: expandStyle, trigger } = useExpandOnPress(navigate);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    trigger();
  };

  return (
    <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.featuredOuter, expandStyle]}>
        <Animated.View style={[styles.featuredShadow, { width: FEATURED_W, height: FEATURED_H }, liftStyle]}>
          <View style={[styles.featuredInner, StyleSheet.absoluteFill]}>
            {bookOfTheMonth.posterUrl ? (
              <Image
                source={{ uri: bookOfTheMonth.posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={['#1e1408', '#0e0e1a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.bookFallback]}
              >
                <Text style={styles.featuredInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
              start={{ x: 0, y: 0.25 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[styles.bookBadge, { backgroundColor: RS.badge.book.bg }]}>
              <Text style={[styles.bookBadgeLabel, { color: RS.badge.book.text }]}>BOOK</Text>
            </View>
            <View style={styles.featuredTextArea}>
              <Text style={styles.featuredTitle} numberOfLines={2}>{bookOfTheMonth.title}</Text>
              <Text style={styles.featuredAuthor}>{bookOfTheMonth.author}</Text>
            </View>
          </View>
        </Animated.View>
        <Text style={styles.featuredDesc}>{bookOfTheMonth.description}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Main BookSection ──────────────────────────────────────────────────────────
export function BookSection() {
  return (
    <View style={styles.container}>

      {/* ── Book of the Month ─────────────────────────────────────────── */}
      <View style={styles.subSection}>
        <SectionHeader
          eyebrow="Book of the Month"
          title="Our Current Read"
          subtitle="One book worth clearing your weekend for."
          titleSerif
        />
        <View style={styles.featuredWrap}>
          <BookOfTheMonthPanel />
        </View>
      </View>

      {/* ── Trending Books ────────────────────────────────────────────── */}
      <View style={styles.subSection}>
        <SectionHeader
          title="Trending Books"
          subtitle="What readers can't put down right now."
        />
        <FlatList<SeedBookItem>
          data={trendingBooks}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
          contentContainerStyle={styles.bookList}
          snapToInterval={BOOK_W + ITEM_SEP}
          decelerationRate="fast"
          renderItem={({ item }: ListRenderItemInfo<SeedBookItem>) => (
            <BookCoverCard item={item} />
          )}
          getItemLayout={(_, index) => ({
            length: BOOK_W,
            offset: (BOOK_W + ITEM_SEP) * index,
            index,
          })}
        />
      </View>

      {/* ── Award Winners Books ───────────────────────────────────────── */}
      <View style={styles.subSection}>
        <SectionHeader
          title="Award Winners"
          subtitle="Booker, Pulitzer, and the books that earned them."
        />
        <FlatList<SeedBookItem>
          data={awardWinnerBooks}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ width: ITEM_SEP }} />}
          contentContainerStyle={styles.bookList}
          snapToInterval={BOOK_W + ITEM_SEP}
          decelerationRate="fast"
          renderItem={({ item }: ListRenderItemInfo<SeedBookItem>) => (
            <BookCoverCard item={item} />
          )}
          getItemLayout={(_, index) => ({
            length: BOOK_W,
            offset: (BOOK_W + ITEM_SEP) * index,
            index,
          })}
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: RS.spacing.xxxl,
  },
  subSection: {
    gap: RS.spacing.sm,
  },
  featuredWrap: {
    paddingHorizontal: RS.spacing.md,
  },
  featuredOuter: {
    gap: RS.spacing.md,
  },
  // Shadow lives on the press-lift wrapper (no overflow:hidden — iOS shadow requires this).
  featuredShadow: {
    borderRadius:  RS.card.radius,
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
  },
  featuredInner: {
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    justifyContent:  'flex-end',
  },
  featuredTextArea: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.md,
    gap:               4,
  },
  featuredTitle: {
    fontSize:      RS.typography.heading,
    fontWeight:    '700',
    fontFamily:    Fonts?.serif,
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
    lineHeight:    26,
  },
  featuredAuthor: {
    fontSize:      RS.typography.caption,
    fontWeight:    '500',
    color:         RS.colors.textSecondary,
    letterSpacing: RS.letterSpacing.wide,
  },
  featuredDesc: {
    fontSize:   RS.typography.body,
    fontWeight: '400',
    color:      RS.colors.textSecondary,
    lineHeight: 22,
  },
  featuredInitial: {
    fontSize:   56,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  bookList: {
    paddingHorizontal: RS.spacing.md,
  },
  // Outer: shadow wrapper (no overflow:hidden)
  bookOuter: {
    shadowColor:   RS.shadow.color,
    shadowOffset:  { width: 0, height: RS.shadow.offsetY },
    shadowOpacity: RS.shadow.opacity,
    shadowRadius:  RS.shadow.radius,
    elevation:     RS.shadow.android,
    borderRadius:  RS.card.radius,
  },
  bookInner: {
    borderRadius:    RS.card.radius,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     RS.colors.border,
    backgroundColor: RS.colors.card,
    justifyContent:  'flex-end',
  },
  bookFallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  bookInitial: {
    fontSize:   38,
    fontWeight: '700',
    color:      RS.colors.textMuted,
  },
  bookBadge: {
    position:          'absolute',
    top:               RS.spacing.xs,
    left:              RS.spacing.xs,
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  bookBadgeLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  bookFooter: {
    paddingHorizontal: RS.spacing.xs + 2,
    paddingBottom:     RS.spacing.sm,
    gap:               2,
  },
  bookTitle: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textPrimary,
    lineHeight: 14,
  },
  bookAuthor: {
    fontSize: RS.typography.overline,
    color:    RS.colors.textMuted,
  },
});
