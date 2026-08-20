/* eslint-disable no-bitwise */
/**
 * ProfileScreen — Peer TechPass viewer with Privacy Sanitization & Link Launchers.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ProfileRegistry from '../services/profile/ProfileRegistry';
import { UserProfile } from '../types/ProfileTypes';
import NFCDeepLinkHandler from '../services/nfc/NFCDeepLinkHandler';
import ConnectionService from '../services/connection/ConnectionService';
import PrivacyService from '../services/profile/PrivacyService';
import { SkillTag } from '../components/SkillTag';
import { ProfileLink } from '../components/ProfileLink';
import { useTheme, typography, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export const ProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mode, colors, toggleTheme } = useTheme();
  const { deviceId } = route.params;

  const rawProfile = ProfileRegistry.getProfile(deviceId);
  const [profile, setProfile] = useState<UserProfile | undefined>(
    rawProfile ? PrivacyService.sanitizeProfile(rawProfile, false) : undefined,
  );
  const [isLoading, setIsLoading] = useState<boolean>(!profile);
  const [isCachedOffline, setIsCachedOffline] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const resolved = await NFCDeepLinkHandler.resolveProfile(deviceId);
      if (resolved) {
        // Enforce Privacy Rules: Strip fields marked as HIDDEN for peer view
        const sanitized = PrivacyService.sanitizeProfile(resolved, false);
        setProfile(sanitized);
        setIsCachedOffline(true);
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!profile) {
      loadProfile();
    }
  }, [profile, loadProfile]);

  const handleConnect = async () => {
    if (!profile) return;
    setIsConnecting(true);
    try {
      await ConnectionService.addConnection(profile, 'Bluetooth');
      Alert.alert(
        'Connected!',
        `${profile.displayName} has been added to your persistent connections.`,
      );
    } catch (_) {
    } finally {
      setIsConnecting(false);
    }
  };

  const avatarColor = (id: string): string => {
    const PALETTE = [
      colors.purple,
      colors.blue,
      colors.green,
      colors.yellow,
      colors.orange,
      colors.pink,
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.centeredContainer}>
          <ActivityIndicator color={colors.purple} size="large" />
          <Text
            style={[
              styles.notFoundSubtitle,
              { color: colors.textSecondary, marginTop: spacing.md },
            ]}
          >
            Resolving TechPass profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.centeredContainer}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
            Profile Not Found
          </Text>
          <Text style={[styles.notFoundSubtitle, { color: colors.textSecondary }]}>
            Unable to resolve TechPass profile for ID ({deviceId.substring(0, 8)}...).
          </Text>
          <View style={styles.retryRow}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                { backgroundColor: colors.yellow, borderColor: colors.black },
              ]}
              onPress={loadProfile}
            >
              <Text style={[styles.backBtnText, { color: colors.black }]}>🔄 Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.backBtn,
                { backgroundColor: colors.purple, borderColor: colors.black },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.backBtnText, { color: colors.black }]}>← Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const bgColor = avatarColor(deviceId);
  const displayName = profile.displayName || 'Techies Professional';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.black },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.black }]}>←</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>TechPass Identity</Text>

        <TouchableOpacity
          style={[
            styles.themeToggleButton,
            { backgroundColor: colors.yellow, borderColor: colors.black },
          ]}
          onPress={toggleTheme}
        >
          <Text style={styles.themeToggleIcon}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.black,
              shadowColor: colors.black,
            },
          ]}
        >
          {isCachedOffline && (
            <View
              style={[
                styles.offlineBadge,
                { backgroundColor: colors.blue, borderColor: colors.black },
              ]}
            >
              <Text style={styles.offlineBadgeText}>🎴 TECHPASS VERIFIED</Text>
            </View>
          )}

          {profile.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={[styles.avatar, { borderColor: colors.black }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.initialsAvatar,
                { backgroundColor: bgColor, borderColor: colors.black },
              ]}
            >
              <Text style={[styles.initials, { color: colors.black }]}>
                {getInitials(displayName)}
              </Text>
            </View>
          )}

          <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
          {!!profile.username && (
            <Text style={[styles.usernameText, { color: colors.textSecondary }]}>
              @{profile.username}
            </Text>
          )}

          {!!profile.category && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.purple, borderColor: colors.black },
              ]}
            >
              <Text style={[styles.categoryText, { color: colors.black }]}>
                🏷️ {profile.category}
              </Text>
            </View>
          )}

          {!!profile.headline && (
            <Text style={[styles.headline, { color: colors.textSecondary }]}>
              {profile.headline}
            </Text>
          )}
          {!!profile.company && (
            <Text style={[styles.company, { color: colors.textTertiary }]}>
              🏢 {profile.company}
            </Text>
          )}
          {!!profile.college && (
            <Text style={[styles.company, { color: colors.textTertiary }]}>
              🎓 {profile.college}
            </Text>
          )}

          {/* Quick Connect Button */}
          <TouchableOpacity
            style={[
              styles.connectBtn,
              { backgroundColor: colors.yellow, borderColor: colors.black },
            ]}
            onPress={handleConnect}
            disabled={isConnecting}
            activeOpacity={0.8}
          >
            {isConnecting ? (
              <ActivityIndicator color={colors.black} size="small" />
            ) : (
              <Text style={[styles.connectBtnText, { color: colors.black }]}>
                🤝 Save to Connections
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* INTENTS */}
        {profile.intents && profile.intents.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.black },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Networking Intent
            </Text>
            <View style={styles.tagsRow}>
              {profile.intents.map((intent) => (
                <View
                  key={intent}
                  style={[
                    styles.intentPill,
                    { backgroundColor: colors.yellow, borderColor: colors.black },
                  ]}
                >
                  <Text style={styles.intentText}>{intent}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* BIO */}
        {!!profile.bio && (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.black },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
            <Text style={[styles.bio, { color: colors.textPrimary }]}>{profile.bio}</Text>
          </View>
        )}

        {/* SKILLS */}
        {profile.skills && profile.skills.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.black },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Skills</Text>
            <View style={styles.tagsRow}>
              {profile.skills.map((skill) => (
                <SkillTag key={skill} label={skill} variant="skill" />
              ))}
            </View>
          </View>
        )}

        {/* LINKS */}
        {(profile.github ||
          profile.linkedin ||
          profile.x ||
          profile.instagram ||
          profile.portfolio ||
          profile.resume ||
          profile.startup ||
          profile.product ||
          profile.blog ||
          profile.email ||
          profile.phone) && (
          <View style={styles.sectionGroup}>
            <Text style={[styles.sectionGroupTitle, { color: colors.textPrimary }]}>
              Links & Contact
            </Text>
            <ProfileLink icon="⌨️" label="GitHub" value={profile.github} />
            <ProfileLink icon="💼" label="LinkedIn" value={profile.linkedin} />
            <ProfileLink icon="𝕏" label="X (Twitter)" value={profile.x} />
            <ProfileLink icon="📸" label="Instagram" value={profile.instagram} />
            <ProfileLink icon="🌐" label="Portfolio" value={profile.portfolio} />
            <ProfileLink icon="📄" label="Resume" value={profile.resume} />
            <ProfileLink icon="🚀" label="Startup" value={profile.startup} />
            <ProfileLink icon="📦" label="Product" value={profile.product} />
            <ProfileLink icon="📝" label="Blog" value={profile.blog} />
            <ProfileLink
              icon="✉️"
              label="Email"
              value={profile.email}
              url={profile.email ? `mailto:${profile.email}` : undefined}
            />
            <ProfileLink
              icon="📞"
              label="Phone"
              value={profile.phone}
              url={profile.phone ? `tel:${profile.phone}` : undefined}
            />

            {profile.customLinks &&
              profile.customLinks.map((cl, i) => (
                <ProfileLink key={i} icon="🔗" label={cl.label} value={cl.url} />
              ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 2.5,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.sm },
  backIcon: { fontSize: 22, fontWeight: typography.extrabold },
  headerTitle: {
    flex: 1,
    fontSize: typography.lg,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    textAlign: 'center',
  },
  themeToggleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: { fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.base, paddingTop: spacing.base },
  heroCard: {
    borderRadius: spacing.radiusXl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.base,
    borderWidth: 2.5,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  offlineBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  offlineBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.extrabold,
    letterSpacing: 0.6,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: spacing.base, borderWidth: 3 },
  initialsAvatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: typography.xxl, fontWeight: typography.extrabold },
  name: {
    fontSize: typography.xxl,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  usernameText: {
    fontSize: typography.xs + 1,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
  },
  categoryText: { fontSize: typography.xs, fontWeight: typography.extrabold },
  headline: {
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: typography.semibold,
  },
  company: {
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: typography.medium,
  },
  connectBtn: {
    marginTop: spacing.md,
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
    alignItems: 'center',
  },
  connectBtnText: { fontSize: typography.sm + 1, fontWeight: typography.extrabold },
  sectionCard: {
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    marginBottom: spacing.base,
    borderWidth: 2.5,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: typography.xs + 1,
    fontWeight: typography.extrabold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  sectionGroup: { marginBottom: spacing.base },
  sectionGroupTitle: {
    fontSize: typography.xs + 1,
    fontWeight: typography.extrabold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm + 2,
    paddingLeft: spacing.xs,
  },
  bio: { fontSize: typography.base, fontWeight: typography.medium, lineHeight: 23 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  intentPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
  },
  intentText: { fontSize: typography.xs, fontWeight: typography.extrabold },
  bottomPad: { height: spacing.xxxl },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  notFoundIcon: { fontSize: 48, marginBottom: spacing.base },
  notFoundTitle: {
    fontSize: typography.lg + 1,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    fontSize: typography.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
  },
  backBtnText: { fontWeight: typography.extrabold, fontSize: typography.base },
  retryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
