import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
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
import { Image } from 'expo-image';

import { DecimalSlider } from '@/components/DecimalSlider';
import { SignInPrompt } from '@/components/SignInPrompt';
import { RS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  emptyDiaryEntry,
  fetchLatestDiaryEntry,
  saveDiaryEntryFull,
  type AttachmentType,
  type DiaryEntryFull,
  type MediaCoreMeta,
  type ReviewScope,
} from '@/lib/supabase/diaryComposer';
import type { MediaType } from '@/data/seedHomeContent';

export interface UniversalReviewComposerProps {
  visible:   boolean;
  onClose:   () => void;
  /** Called after a successful save, before onClose — lets the caller refresh its own displayed rating/review. */
  onSaved?:  (entry: DiaryEntryFull) => void;
  mediaId:    string;   // route id, e.g. "film-693134"
  mediaType:  MediaType; // 'film' | 'tv' | 'book' — reuses the app's existing type rather than inventing a parallel one (see RETURN)
  title:      string;
  posterUrl:  string | null;
  year:       number;
  genres?:      string[];
  runtime?:     number | null;
  voteAverage?: number | null;
  director?:    string | null;
  /** Episode-level scoping — accepted for a future episode screen; no current screen passes these (see RETURN's SURFACES_WIRED). */
  showId?:        string;
  seasonNumber?:  number;
  episodeNumber?: number;
  reviewScope?:   ReviewScope;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, active && styles.toggleActive]}>
      <MaterialIcons
        name={active ? 'check-circle' : 'radio-button-unchecked'}
        size={15}
        color={active ? RS.button.primaryText : RS.colors.textSecondary}
      />
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>{label}</Text>
    </Pressable>
  );
}

// ONE shared composer used everywhere a Review action exists (currently:
// Movie Detail — see RETURN's SURFACES_WIRED for what else was and wasn't
// wired). Movie/TV vs. Book sections render conditionally off `mediaType`.
// Bottom-sheet-style modal (chosen over Rate's centered modal because this
// content is long/scrollable — "whichever fits" per the brief).
export function UniversalReviewComposer(props: UniversalReviewComposerProps) {
  const {
    visible, onClose, onSaved,
    mediaId, mediaType, title, posterUrl, year,
    genres = [], runtime = null, voteAverage = null, director = null,
    showId, seasonNumber, episodeNumber, reviewScope,
  } = props;

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<DiaryEntryFull>(emptyDiaryEntry());
  const [layersOpen, setLayersOpen] = useState(false);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState<AttachmentType | null>(null);
  const [attachmentDraft, setAttachmentDraft] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const key = { mediaId, mediaType, showId, seasonNumber, episodeNumber, reviewScope };
  const core: MediaCoreMeta = { title, posterUrl, year, genres, runtime, voteAverage, director };

  useEffect(() => {
    if (!visible || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLatestDiaryEntry(user.id, key)
      .then((data) => {
        if (cancelled) return;
        setEntry(data);
        setAttachmentDraft(data.attachmentUrl ?? '');
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load your existing entry.');
        setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user, mediaId, mediaType]);

  const patch = (fields: Partial<DiaryEntryFull>) => setEntry((prev) => ({ ...prev, ...fields }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveDiaryEntryFull(user.id, key, core, entry);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSaved?.(entry);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your review.');
    } finally {
      setSaving(false);
    }
  };

  const openAttachmentInput = (type: AttachmentType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setAttachmentPickerOpen(type);
    setAttachmentDraft(entry.attachmentType === type ? entry.attachmentUrl ?? '' : '');
  };

  const confirmAttachment = () => {
    const url = attachmentDraft.trim();
    if (!url) {
      patch({ attachmentUrl: null, attachmentType: null });
    } else {
      patch({ attachmentUrl: url, attachmentType: attachmentPickerOpen });
    }
    setAttachmentPickerOpen(null);
  };

  const removeAttachment = () => {
    patch({ attachmentUrl: null, attachmentType: null });
    setAttachmentDraft('');
    setAttachmentPickerOpen(null);
  };

  const dateLabel = mediaType === 'book' ? 'Read date' : 'Watched date';
  const badgeLabel = mediaType === 'film' ? 'FILM' : mediaType === 'tv' ? 'TV' : 'BOOK';

  const reviewPlaceholder =
    mediaType === 'book'
      ? 'What did you think of this book?'
      : mediaType === 'tv'
      ? 'What did you think of this show?'
      : 'What did you think of this film?';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <View style={styles.grabber} />

            {!user ? (
              <View style={styles.signInWrap}>
                <SignInPrompt message="Sign in to write a review." />
              </View>
            ) : loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={RS.colors.accent} />
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Header card */}
                <View style={styles.header}>
                  <View style={styles.posterOuter}>
                    {posterUrl ? (
                      <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
                    ) : (
                      <View style={[styles.poster, styles.posterFallback]} />
                    )}
                  </View>
                  <View style={styles.headerMeta}>
                    <Text style={styles.headerTitle} numberOfLines={2}>{title}</Text>
                    <View style={styles.headerRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badgeLabel}</Text>
                      </View>
                      {year ? <Text style={styles.headerYear}>{year}</Text> : null}
                    </View>
                  </View>
                </View>

                {/* Watched/Read date */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{dateLabel}</Text>
                  <Pressable style={styles.dateBtn} onPress={() => setDatePickerOpen(true)}>
                    <MaterialIcons name="event" size={16} color={RS.colors.textSecondary} />
                    <Text style={styles.dateText}>{entry.watchedDate || todayISO()}</Text>
                  </Pressable>
                  {datePickerOpen && (
                    <DateTimePicker
                      value={new Date(`${entry.watchedDate || todayISO()}T12:00:00`)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        if (Platform.OS === 'android') setDatePickerOpen(false);
                        if (date) patch({ watchedDate: date.toISOString().slice(0, 10) });
                      }}
                    />
                  )}
                  {Platform.OS === 'ios' && datePickerOpen && (
                    <Pressable style={styles.dateDoneBtn} onPress={() => setDatePickerOpen(false)}>
                      <Text style={styles.dateDoneLabel}>Done</Text>
                    </Pressable>
                  )}
                </View>

                {/* Rating */}
                <View style={styles.field}>
                  <DecimalSlider
                    label="Rating"
                    value={entry.rating}
                    onChange={(v) => patch({ rating: v })}
                  />
                </View>

                {/* Review text */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Review</Text>
                  <TextInput
                    style={styles.reviewInput}
                    value={entry.review}
                    onChangeText={(text) => patch({ review: text })}
                    placeholder={reviewPlaceholder}
                    placeholderTextColor={RS.colors.textMuted}
                    multiline
                  />
                </View>

                {/* Attachments */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Attachment</Text>
                  <View style={styles.attachRow}>
                    <Pressable style={styles.attachBtn} onPress={() => openAttachmentInput('image')}>
                      <MaterialIcons name="image" size={15} color={RS.colors.textSecondary} />
                      <Text style={styles.attachBtnLabel}>Image</Text>
                    </Pressable>
                    <Pressable style={styles.attachBtn} onPress={() => openAttachmentInput('gif')}>
                      <MaterialIcons name="gif" size={15} color={RS.colors.textSecondary} />
                      <Text style={styles.attachBtnLabel}>GIF</Text>
                    </Pressable>
                    <Pressable style={styles.attachBtn} onPress={() => openAttachmentInput('link')}>
                      <MaterialIcons name="link" size={15} color={RS.colors.textSecondary} />
                      <Text style={styles.attachBtnLabel}>Link</Text>
                    </Pressable>
                  </View>

                  {attachmentPickerOpen && (
                    <View style={styles.attachInputRow}>
                      <TextInput
                        style={styles.attachInput}
                        value={attachmentDraft}
                        onChangeText={setAttachmentDraft}
                        placeholder={
                          attachmentPickerOpen === 'image' ? 'Paste an image URL…'
                          : attachmentPickerOpen === 'gif' ? 'Paste a GIF URL…'
                          : 'Paste a link…'
                        }
                        placeholderTextColor={RS.colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Pressable style={styles.attachConfirmBtn} onPress={confirmAttachment}>
                        <Text style={styles.attachConfirmLabel}>Add</Text>
                      </Pressable>
                    </View>
                  )}

                  {entry.attachmentUrl && !attachmentPickerOpen ? (
                    <View style={styles.attachedRow}>
                      <Text style={styles.attachedText} numberOfLines={1}>
                        {entry.attachmentType?.toUpperCase()}: {entry.attachmentUrl}
                      </Text>
                      <Pressable onPress={removeAttachment} hitSlop={8}>
                        <MaterialIcons name="close" size={16} color={RS.colors.textMuted} />
                      </Pressable>
                    </View>
                  ) : null}

                  {/* Image attachments are stored as a URL only in this
                      phase — no Supabase Storage upload pipeline is wired
                      yet, so a locally-picked device photo wouldn't persist
                      across devices/reinstalls. Paste-a-URL is the honest v1
                      here, matching GIF's own accepted v1 approach. */}
                </View>

                {/* Media-type-specific toggles */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Details</Text>
                  <View style={styles.toggleGrid}>
                    <Toggle label="Favourite" active={entry.favourite} onPress={() => patch({ favourite: !entry.favourite })} />
                    {mediaType === 'book' ? (
                      <Toggle label="Reread" active={entry.reread} onPress={() => patch({ reread: !entry.reread })} />
                    ) : (
                      <Toggle label="Rewatch" active={entry.rewatch} onPress={() => patch({ rewatch: !entry.rewatch })} />
                    )}
                    <Toggle label="Spoilers" active={entry.containsSpoilers} onPress={() => patch({ containsSpoilers: !entry.containsSpoilers })} />

                    {mediaType === 'film' && (
                      <Toggle label="Watched in Cinema" active={entry.watchedInCinema} onPress={() => patch({ watchedInCinema: !entry.watchedInCinema })} />
                    )}
                    {mediaType === 'tv' && (
                      <>
                        <Toggle label="Watched Live" active={entry.watchedLive} onPress={() => patch({ watchedLive: !entry.watchedLive })} />
                        <Toggle label="Binge Watched" active={entry.bingeWatched} onPress={() => patch({ bingeWatched: !entry.bingeWatched })} />
                      </>
                    )}
                    {mediaType === 'book' && (
                      <>
                        <Toggle label="Physical Book" active={entry.physicalBook} onPress={() => patch({ physicalBook: !entry.physicalBook })} />
                        <Toggle label="Kindle / eBook" active={entry.ebook} onPress={() => patch({ ebook: !entry.ebook })} />
                        <Toggle label="Audiobook" active={entry.audiobook} onPress={() => patch({ audiobook: !entry.audiobook })} />
                      </>
                    )}
                  </View>
                </View>

                {/* Expandable review layers */}
                <View style={styles.field}>
                  <Pressable style={styles.layersHeader} onPress={() => setLayersOpen((v) => !v)}>
                    <Text style={styles.fieldLabel}>Review Layers (optional)</Text>
                    <MaterialIcons name={layersOpen ? 'expand-less' : 'expand-more'} size={20} color={RS.colors.textSecondary} />
                  </Pressable>

                  {layersOpen && (
                    <View style={styles.layersList}>
                      {mediaType === 'book' ? (
                        <>
                          <DecimalSlider label="Writing" value={entry.writingRating} onChange={(v) => patch({ writingRating: v })} />
                          <DecimalSlider label="Characters" value={entry.layerCharacters} onChange={(v) => patch({ layerCharacters: v })} />
                          <DecimalSlider label="Plot" value={entry.layerPlot} onChange={(v) => patch({ layerPlot: v })} />
                          <DecimalSlider label="Pacing" value={entry.layerPacing} onChange={(v) => patch({ layerPacing: v })} />
                          <DecimalSlider label="World-building" value={entry.layerWorldbuilding} onChange={(v) => patch({ layerWorldbuilding: v })} />
                          <DecimalSlider label="Themes" value={entry.layerThemes} onChange={(v) => patch({ layerThemes: v })} />
                          <DecimalSlider label="Emotional Impact" value={entry.emotionalImpactRating} onChange={(v) => patch({ emotionalImpactRating: v })} />
                          <DecimalSlider label="Re-readability" value={entry.layerRereadability} onChange={(v) => patch({ layerRereadability: v })} />
                        </>
                      ) : (
                        <>
                          <DecimalSlider label="Score / Soundtrack" value={entry.scoreRating} onChange={(v) => patch({ scoreRating: v })} />
                          <DecimalSlider label="Cinematography" value={entry.cinematographyRating} onChange={(v) => patch({ cinematographyRating: v })} />
                          <DecimalSlider label="Writing" value={entry.writingRating} onChange={(v) => patch({ writingRating: v })} />
                          <DecimalSlider label="Performances" value={entry.performancesRating} onChange={(v) => patch({ performancesRating: v })} />
                          <DecimalSlider label="Direction" value={entry.directionRating} onChange={(v) => patch({ directionRating: v })} />
                          <DecimalSlider label="Rewatchability" value={entry.rewatchabilityRating} onChange={(v) => patch({ rewatchabilityRating: v })} />
                          <DecimalSlider label="Emotional Impact" value={entry.emotionalImpactRating} onChange={(v) => patch({ emotionalImpactRating: v })} />
                          <DecimalSlider label="Entertainment" value={entry.entertainmentRating} onChange={(v) => patch({ entertainmentRating: v })} />
                        </>
                      )}
                    </View>
                  )}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.actions}>
                  <Pressable style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelLabel}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color={RS.button.filledText} /> : <Text style={styles.saveLabel}>Save Review</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            )}
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
    maxHeight:          '90%',
    borderTopLeftRadius:  RS.card.radius + 8,
    borderTopRightRadius: RS.card.radius + 8,
    overflow:           'hidden',
    backgroundColor:    RS.colors.card,
    borderWidth:        0.5,
    borderColor:        RS.glass.border,
    borderBottomWidth:  0,
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
  signInWrap: {
    padding: RS.spacing.lg,
  },
  loadingWrap: {
    paddingVertical: RS.spacing.xxl,
    alignItems:      'center',
  },
  scrollContent: {
    paddingHorizontal: RS.spacing.md,
    paddingBottom:     RS.spacing.xl,
    gap:               RS.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    gap:           RS.spacing.sm + 4,
    alignItems:    'flex-start',
  },
  posterOuter: {
    borderRadius: 10,
    overflow:     'hidden',
  },
  poster: {
    width:  56,
    height: 84,
  },
  posterFallback: {
    backgroundColor: RS.colors.elevated,
  },
  headerMeta: {
    flex: 1,
    gap:  4,
    paddingTop: 2,
  },
  headerTitle: {
    fontSize:      RS.typography.subheading,
    fontWeight:    '700',
    color:         RS.colors.textPrimary,
    letterSpacing: RS.letterSpacing.tight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           RS.spacing.xs,
  },
  badge: {
    borderRadius:      RS.badge.pillRadius,
    paddingHorizontal: 6,
    paddingVertical:   1,
    backgroundColor:   RS.colors.elevated,
  },
  badgeText: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.5,
    color:         RS.colors.textMuted,
  },
  headerYear: {
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  field: {
    gap: RS.spacing.xs,
  },
  fieldLabel: {
    fontSize:      RS.typography.overline,
    fontWeight:    '700',
    color:         RS.colors.textMuted,
    letterSpacing: RS.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  dateBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    alignSelf:         'flex-start',
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 2,
    backgroundColor:   RS.colors.elevated,
  },
  dateText: {
    fontSize:   RS.typography.body,
    color:      RS.colors.textPrimary,
  },
  dateDoneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: RS.spacing.xs,
  },
  dateDoneLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.colors.accent,
  },
  reviewInput: {
    fontSize:          RS.typography.body,
    color:             RS.colors.textPrimary,
    minHeight:         90,
    textAlignVertical: 'top',
    borderRadius:      RS.card.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    padding:           RS.spacing.sm + 2,
  },
  attachRow: {
    flexDirection: 'row',
    gap:           RS.spacing.xs + 2,
  },
  attachBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 2,
    backgroundColor:   RS.colors.elevated,
  },
  attachBtnLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  attachInputRow: {
    flexDirection: 'row',
    gap:           RS.spacing.xs,
    marginTop:     RS.spacing.xs,
  },
  attachInput: {
    flex:              1,
    fontSize:          RS.typography.body,
    color:             RS.colors.textPrimary,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.colors.border,
    backgroundColor:   RS.colors.elevated,
    paddingHorizontal: RS.spacing.sm + 2,
    paddingVertical:   RS.spacing.xs + 2,
  },
  attachConfirmBtn: {
    borderRadius:      RS.button.radius,
    backgroundColor:   RS.button.filledBg,
    paddingHorizontal: RS.spacing.md,
    justifyContent:    'center',
  },
  attachConfirmLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '700',
    color:      RS.button.filledText,
  },
  attachedRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      RS.spacing.xs,
    gap:            RS.spacing.xs,
  },
  attachedText: {
    flex:     1,
    fontSize: RS.typography.caption,
    color:    RS.colors.textMuted,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           RS.spacing.xs + 2,
  },
  toggle: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      RS.button.radius,
    borderWidth:       0.5,
    borderColor:       RS.glass.border,
    paddingHorizontal: 12,
    paddingVertical:   8,
    backgroundColor:   RS.colors.elevated,
  },
  toggleActive: {
    borderColor:     RS.button.primaryBorder,
    backgroundColor: RS.button.primaryFill,
    borderWidth:     1,
  },
  toggleLabel: {
    fontSize:   RS.typography.caption,
    fontWeight: '600',
    color:      RS.colors.textSecondary,
  },
  toggleLabelActive: {
    color: RS.button.primaryText,
  },
  layersHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  layersList: {
    gap:       RS.spacing.md,
    marginTop: RS.spacing.sm,
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
  saveLabel: {
    fontSize:      RS.typography.body,
    fontWeight:    '700',
    color:         RS.button.filledText,
    letterSpacing: RS.letterSpacing.wide,
  },
});
