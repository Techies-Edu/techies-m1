/**
 * MyProfileScreen — Complete TechPass Identity Editor & Physical NFC Writer.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useMyProfile } from '../hooks/useMyProfile';
import { NFCWriteModal } from '../components/NFCWriteModal';
import { ProfessionalCategory, AvailabilityIntent, CustomLink } from '../types/ProfileTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'MyProfile'>;

const CATEGORIES: ProfessionalCategory[] = [
  'Developer',
  'Student',
  'Mentor',
  'Professional',
  'Recruiter',
  'Founder',
  'Startup',
  'Investor',
  'Community Leader',
];

const ALL_INTENTS: AvailabilityIntent[] = [
  'Open to Networking',
  'Open to Freelance',
  'Hiring',
  'Looking for Opportunities',
  'Looking for Internship',
  'Looking for Co-founder',
  'Seeking Investment',
  'Investing',
  'Mentoring',
  'Collaboration',
];

interface FormState {
  username: string;
  displayName: string;
  headline: string;
  designation: string;
  company: string;
  college: string;
  bio: string;
  category: ProfessionalCategory;
  intents: AvailabilityIntent[];
  skillsText: string;
  interestsText: string;
  github: string;
  linkedin: string;
  x: string;
  instagram: string;
  portfolio: string;
  resume: string;
  startup: string;
  product: string;
  blog: string;
  email: string;
  phone: string;
  avatarUrl: string;
  customLinks: CustomLink[];
}

function parseList(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const MyProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { profile, isLoading, updateProfile } = useMyProfile();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [showNfcModal, setShowNfcModal] = useState(false);

  // Custom link builder state
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (profile && !form) {
      setForm({
        username: profile.username || '',
        displayName: profile.displayName || '',
        headline: profile.headline || '',
        designation: profile.designation || '',
        company: profile.company || '',
        college: profile.college || '',
        bio: profile.bio || '',
        category: profile.category || 'Developer',
        intents: profile.intents || ['Open to Networking'],
        skillsText: (profile.skills || []).join(', '),
        interestsText: (profile.interests || []).join(', '),
        github: profile.github || '',
        linkedin: profile.linkedin || '',
        x: profile.x || '',
        instagram: profile.instagram || '',
        portfolio: profile.portfolio || '',
        resume: profile.resume || '',
        startup: profile.startup || '',
        product: profile.product || '',
        blog: profile.blog || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatarUrl: profile.avatarUrl || '',
        customLinks: profile.customLinks || [],
      });
    }
  }, [profile, form]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const toggleIntent = (intent: AvailabilityIntent) => {
    if (!form) return;
    const current = form.intents;
    const exists = current.includes(intent);
    const updated = exists ? current.filter((i) => i !== intent) : [...current, intent];
    setField('intents', updated);
  };

  const handleAddCustomLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim() || !form) return;
    const updated = [...form.customLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }];
    setField('customLinks', updated);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };

  const handleRemoveCustomLink = (index: number) => {
    if (!form) return;
    const updated = form.customLinks.filter((_, i) => i !== index);
    setField('customLinks', updated);
  };

  const triggerAestheticToast = useCallback(() => {
    setShowToast(true);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.delay(2600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  }, [toastAnim]);

  const handleSave = useCallback(async () => {
    if (!form) return;
    setSaving(true);
    try {
      await updateProfile({
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        headline: form.headline.trim(),
        designation: form.designation.trim(),
        company: form.company.trim(),
        college: form.college.trim(),
        bio: form.bio.trim(),
        category: form.category,
        intents: form.intents,
        skills: parseList(form.skillsText),
        interests: parseList(form.interestsText),
        github: form.github.trim(),
        linkedin: form.linkedin.trim(),
        x: form.x.trim(),
        instagram: form.instagram.trim(),
        portfolio: form.portfolio.trim(),
        resume: form.resume.trim(),
        startup: form.startup.trim(),
        product: form.product.trim(),
        blog: form.blog.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl.trim(),
        customLinks: form.customLinks,
      });
      triggerAestheticToast();
    } catch {
      // Handled
    } finally {
      setSaving(false);
    }
  }, [form, updateProfile, triggerAestheticToast]);

  if (isLoading || !form) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FE" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#4F46E5" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Deep Royal Indigo Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit TechPass Identity</Text>

        <TouchableOpacity
          style={[styles.headerSaveBtn, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#1F2937" size="small" />
          ) : (
            <Text style={styles.headerSaveBtnText}>Save ✓</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Aesthetic Toast Banner */}
      {showToast && (
        <Animated.View
          style={[
            styles.aestheticToast,
            {
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-60, 0],
                  }),
                },
                {
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
              opacity: toastAnim,
            },
          ]}
        >
          <Text style={styles.aestheticToastText}>✨ TECHPASS SAVED & BROADCAST ✨</Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Profile & NFC Pass Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(form.displayName || form.username || 'T').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.avatarTextCol}>
                <Text style={styles.heroName}>{form.displayName || 'Techies Professional'}</Text>
                <Text style={styles.heroHandle}>@{form.username || 'username'}</Text>
                <View style={styles.tpBadgePill}>
                  <Text style={styles.tpBadgeText}>🎴 {profile?.techPassId || 'TP-8F92-4A7B'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.writeNfcBtn}
              onPress={() => setShowNfcModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.writeNfcBtnText}>📲 Write TechPass to Physical NFC Tag</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 1: PERSONAL & PROFESSIONAL IDENTITY */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderIcon}>👤</Text>
              <Text style={styles.sectionHeaderTitle}>Personal & Professional Identity</Text>
            </View>

            <Field
              label="Username Handle"
              value={form.username}
              onChangeText={(v) => setField('username', v)}
              placeholder="e.g. johndoe"
            />
            <Field
              label="Full Name"
              value={form.displayName}
              onChangeText={(v) => setField('displayName', v)}
              placeholder="Your full name"
            />
            <Field
              label="Professional Headline"
              value={form.headline}
              onChangeText={(v) => setField('headline', v)}
              placeholder="e.g. Full Stack & P2P Architect"
            />
            <Field
              label="Job Designation"
              value={form.designation}
              onChangeText={(v) => setField('designation', v)}
              placeholder="e.g. Lead Engineer"
            />
            <Field
              label="Company / Organisation"
              value={form.company}
              onChangeText={(v) => setField('company', v)}
              placeholder="Current employer"
            />
            <Field
              label="College / University"
              value={form.college}
              onChangeText={(v) => setField('college', v)}
              placeholder="School or university"
            />
          </View>

          {/* SECTION 2: CATEGORY & NETWORKING INTENT */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderIcon}>🎯</Text>
              <Text style={styles.sectionHeaderTitle}>Category & Networking Intent</Text>
            </View>

            <Text style={styles.fieldLabel}>Primary Role Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map((cat) => {
                const active = form.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, active && styles.activeCatChip]}
                    onPress={() => setField('category', cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.activeCatChipText]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.fieldLabel, styles.mt14]}>Availability & Intent Tags</Text>
            <View style={styles.chipWrap}>
              {ALL_INTENTS.map((intent) => {
                const active = form.intents.includes(intent);
                return (
                  <TouchableOpacity
                    key={intent}
                    style={[styles.chip, active && styles.activeIntentChip]}
                    onPress={() => toggleIntent(intent)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.activeIntentChipText]}>
                      {intent}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION 3: BIO & SKILLS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderIcon}>📝</Text>
              <Text style={styles.sectionHeaderTitle}>Bio & Technical Skills</Text>
            </View>

            <Field
              label="Professional Bio"
              value={form.bio}
              onChangeText={(v) => setField('bio', v)}
              placeholder="Short professional summary..."
              multiline
              numberOfLines={4}
            />
            <Field
              label="Skills (comma-separated)"
              value={form.skillsText}
              onChangeText={(v) => setField('skillsText', v)}
              placeholder="React Native, Rust, BLE, Node.js..."
            />
            <Field
              label="Interests (comma-separated)"
              value={form.interestsText}
              onChangeText={(v) => setField('interestsText', v)}
              placeholder="Open Source, AI, Decentralization..."
            />
          </View>

          {/* SECTION 4: SOCIAL & PORTFOLIO LINKS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderIcon}>🌐</Text>
              <Text style={styles.sectionHeaderTitle}>Social & Professional Links</Text>
            </View>

            <Field
              label="Email Address"
              value={form.email}
              onChangeText={(v) => setField('email', v)}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <Field
              label="Phone Number"
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder="+1 234 567 8900"
              keyboardType="phone-pad"
            />
            <Field
              label="LinkedIn URL"
              value={form.linkedin}
              onChangeText={(v) => setField('linkedin', v)}
              placeholder="https://linkedin.com/in/username"
              keyboardType="url"
            />
            <Field
              label="GitHub URL"
              value={form.github}
              onChangeText={(v) => setField('github', v)}
              placeholder="https://github.com/username"
              keyboardType="url"
            />
            <Field
              label="X (Twitter) URL"
              value={form.x}
              onChangeText={(v) => setField('x', v)}
              placeholder="https://x.com/username"
              keyboardType="url"
            />
            <Field
              label="Instagram URL"
              value={form.instagram}
              onChangeText={(v) => setField('instagram', v)}
              placeholder="https://instagram.com/username"
              keyboardType="url"
            />
            <Field
              label="Portfolio URL"
              value={form.portfolio}
              onChangeText={(v) => setField('portfolio', v)}
              placeholder="https://yourportfolio.com"
              keyboardType="url"
            />
            <Field
              label="Resume URL"
              value={form.resume}
              onChangeText={(v) => setField('resume', v)}
              placeholder="https://drive.google.com/..."
              keyboardType="url"
            />
            <Field
              label="Startup URL"
              value={form.startup}
              onChangeText={(v) => setField('startup', v)}
              placeholder="https://mystartup.com"
              keyboardType="url"
            />
            <Field
              label="Product URL"
              value={form.product}
              onChangeText={(v) => setField('product', v)}
              placeholder="https://myproduct.io"
              keyboardType="url"
            />
            <Field
              label="Technical Blog URL"
              value={form.blog}
              onChangeText={(v) => setField('blog', v)}
              placeholder="https://blog.example.com"
              keyboardType="url"
            />
          </View>

          {/* SECTION 5: CUSTOM LINKS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderIcon}>🔗</Text>
              <Text style={styles.sectionHeaderTitle}>Custom Web Links</Text>
            </View>

            {form.customLinks.map((link, i) => (
              <View key={i} style={styles.customLinkRow}>
                <View style={styles.flex1}>
                  <Text style={styles.customLinkLabel}>{link.label}</Text>
                  <Text style={styles.customLinkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveCustomLink(i)}>
                  <Text style={styles.removeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addCustomBox}>
              <TextInput
                style={[styles.input, styles.mb8]}
                placeholder="Link Label (e.g. Substack)"
                placeholderTextColor="#9CA3AF"
                value={newLinkLabel}
                onChangeText={setNewLinkLabel}
              />
              <TextInput
                style={[styles.input, styles.mb12]}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
                value={newLinkUrl}
                onChangeText={setNewLinkUrl}
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleAddCustomLink}
                activeOpacity={0.85}
              >
                <Text style={styles.addBtnText}>➕ Add Custom Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom spacing for floating save button */}
          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Save Action Bar */}
      <View style={styles.floatingActionBar}>
        <TouchableOpacity
          style={[styles.floatingSaveBtn, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.floatingSaveBtnText}>Save & Broadcast Identity ✓</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* NFC Write Modal */}
      {!!profile?.deviceId && (
        <NFCWriteModal
          visible={showNfcModal}
          userId={profile.deviceId}
          onClose={() => setShowNfcModal(false)}
          onTestTechPass={(targetId) => navigation.navigate('Profile', { deviceId: targetId })}
        />
      )}
    </SafeAreaView>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines = 1,
  keyboardType = 'default',
}) => {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
        autoCorrect={false}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
};

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 46,
  },
  multiline: {
    minHeight: 90,
    paddingTop: 10,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSaveBtn: {
    backgroundColor: '#FEE57E',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  aestheticToast: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  aestheticToastText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarTextCol: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  heroHandle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  tpBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDECDA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tpBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  writeNfcBtn: {
    backgroundColor: '#FEE57E',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  writeNfcBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  sectionHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeCatChip: {
    backgroundColor: '#4F46E5',
  },
  activeCatChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeIntentChip: {
    backgroundColor: '#FEE57E',
  },
  activeIntentChipText: {
    color: '#1F2937',
    fontWeight: '700',
  },
  customLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FE',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customLinkLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  customLinkUrl: {
    fontSize: 12,
    color: '#4F46E5',
  },
  removeIcon: {
    fontSize: 16,
    color: '#EF4444',
    padding: 4,
  },
  addCustomBox: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8F9FE',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  addBtn: {
    backgroundColor: '#FDECDA',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  floatingActionBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  floatingSaveBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingSaveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  flex1: {
    flex: 1,
  },
  mt14: {
    marginTop: 14,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  bottomPad: {
    height: 100,
  },
});
