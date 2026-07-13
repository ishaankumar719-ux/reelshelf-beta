import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
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

import { RS } from '@/constants/theme';
import type { ListEditFields, ListVisibility } from '@/lib/supabase/lists';
import { getMediaKey } from '@/utils/listKeys';

const VISIBILITY_OPTIONS: { value: ListVisibility; label: string; help: string }[] = [
  { value: 'public',   label: 'Public',   help: "Public lists appear on your profile and can be viewed by others." },
  { value: 'private',  label: 'Private',  help: "Private lists are only visible to you." },
  { value: 'unlisted', label: 'Unlisted', help: "Unlisted lists won't appear on your profile or in Discover, but anyone with the direct link can view them." },
];

interface ListEditorModalProps {
  visible:  boolean;
  onClose:  () => void;
  /** Present when editing an existing list; absent when creating a new one. */
  initial?: ListEditFields;
  onSave:   (fields: ListEditFields) => Promise<void>;
}

const TITLE_MAX = 100;

// Create/Edit List — one shared bottom sheet for both flows (matching the
// EditProfileModal/MountRushmoreEditor convention already established).
// Visibility values and copy match the website's exact 3-way model
// (WEBSITE_LISTS_AUDIT.md §1) — Public/Private/Unlisted, not a simple
// public/private boolean.
export function ListEditorModal({ visible, onClose, initial, onSave }: ListEditorModalProps) {
  const isEditing = !!initial;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility, setVisibility] = useState<ListVisibility>(initial?.visibility ?? 'public');
  const [isRanked, setIsRanked] = useState(initial?.isRanked ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setVisibility(initial?.visibility ?? 'public');
    setIsRanked(initial?.isRanked ?? true);
    setError(null);
  }, [visible, initial]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), description: description.trim(), visibility, isRanked });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this list.');
    } finally {
      setSaving(false);
    }
  };

  const activeVisibilityHelp = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.help;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <BlurView tint="dark" intensity={RS.blur.cardInfo} style={StyleSheet.absoluteFill} />
            <View style={styles.grabber} />

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.headerTitle}>{isEditing ? 'Edit List' : 'New List'}</Text>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Title</Text>
                  <Text style={styles.counter}>{title.length} / {TITLE_MAX}</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={(t) => setTitle(t.slice(0, TITLE_MAX))}
                  placeholder="e.g. All-Time Favourites"
                  placeholderTextColor={RS.colors.textMuted}
                  maxLength={TITLE_MAX}
                  autoFocus={!isEditing}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.descInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What's this list about?"
                  placeholderTextColor={RS.colors.textMuted}
                  multiline
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Visibility</Text>
                <View style={styles.segmentRow}>
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const active = visibility === opt.value;
                    return (
                      <Pressable
                        key={getMediaKey('list-visibility', opt.value)}
                        style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setVisibility(opt.value);
                        }}
                      >
                        <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {activeVisibilityHelp ? <Text style={styles.helpText}>{activeVisibilityHelp}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>List Type</Text>
                <View style={styles.segmentRow}>
                  {([{ v: true, label: 'Ranked' }, { v: false, label: 'Unranked' }] as const).map((opt) => {
                    const active = isRanked === opt.v;
                    return (
                      <Pressable
                        key={getMediaKey('list-ranked', String(opt.v))}
                        style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setIsRanked(opt.v);
                        }}
                      >
                        <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.helpText}>
                  {isRanked ? 'Ranked lists display numbered positions.' : 'Unranked lists are simple collections without ordering.'}
                </Text>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={RS.button.filledText} /> : <Text style={styles.saveLabel}>{isEditing ? 'Save Changes' : 'Create List'}</Text>}
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%', borderTopLeftRadius: RS.card.radius + 8, borderTopRightRadius: RS.card.radius + 8,
    overflow: 'hidden', backgroundColor: RS.colors.card, borderWidth: 0.5, borderColor: RS.glass.border, borderBottomWidth: 0,
  },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.24)', marginTop: RS.spacing.sm, marginBottom: RS.spacing.xs },
  scrollContent: { paddingHorizontal: RS.spacing.md, paddingBottom: RS.spacing.xl, gap: RS.spacing.md },
  headerTitle: { fontSize: RS.typography.heading, fontWeight: '700', color: RS.colors.textPrimary, textAlign: 'center', marginBottom: RS.spacing.xs },
  field: { gap: RS.spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  counter: { fontSize: RS.typography.overline, color: RS.colors.textMuted },
  input: { borderRadius: RS.card.radius, borderWidth: 0.5, borderColor: RS.colors.border, backgroundColor: RS.colors.elevated, paddingHorizontal: RS.spacing.sm + 2, paddingVertical: RS.spacing.sm, fontSize: RS.typography.body, color: RS.colors.textPrimary },
  descInput: { minHeight: 70, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', gap: RS.spacing.xs, backgroundColor: RS.colors.elevated, borderRadius: RS.button.radius, padding: 3 },
  segmentBtn: { flex: 1, borderRadius: RS.button.radius, paddingVertical: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: RS.button.primaryFill, borderWidth: 1, borderColor: RS.button.primaryBorder },
  segmentLabel: { fontSize: RS.typography.caption, fontWeight: '600', color: RS.colors.textSecondary },
  segmentLabelActive: { color: RS.button.primaryText, fontWeight: '700' },
  helpText: { fontSize: RS.typography.overline, color: RS.colors.textMuted, lineHeight: 14 },
  errorText: { fontSize: RS.typography.caption + 1, color: '#f87171' },
  actions: { flexDirection: 'row', gap: RS.spacing.sm, marginTop: RS.spacing.xs },
  cancelBtn: { flex: 1, borderRadius: RS.button.radius, borderWidth: 1, borderColor: RS.button.secondaryBorder, paddingVertical: RS.button.paddingV, alignItems: 'center' },
  cancelLabel: { fontSize: RS.typography.body, fontWeight: '600', color: RS.button.secondaryText },
  saveBtn: { flex: 2, borderRadius: RS.button.radius, backgroundColor: RS.button.filledBg, paddingVertical: RS.button.paddingV, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveLabel: { fontSize: RS.typography.body, fontWeight: '700', color: RS.button.filledText, letterSpacing: RS.letterSpacing.wide },
});
