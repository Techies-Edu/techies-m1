/* eslint-disable no-bitwise */
/**
 * ProximityModal — Modern Neo-Brutalist Instant Match Modal (< 12 cm) with ThemeContext.
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { NearbyUser } from '../types/ProfileTypes';
import { useTheme, typography, spacing } from '../theme';

interface Props {
  user: NearbyUser | null;
  visible: boolean;
  onViewProfile: (deviceId: string) => void;
  onDismiss: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export const ProximityModal: React.FC<Props> = ({ user, visible, onViewProfile, onDismiss }) => {
  const { colors } = useTheme();

  if (!user || !visible) return null;

  const profile = user.profile;
  const displayName = profile?.displayName || 'Nearby Professional';
  const headline = profile?.headline || 'MeshConnect User';
  const company = profile?.company || profile?.college || '';

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

  const bgColor = avatarColor(user.deviceId);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.black,
              shadowColor: colors.black,
            },
          ]}
        >
          {/* Top pulse match banner */}
          <View
            style={[
              styles.matchBanner,
              { backgroundColor: colors.yellow, borderColor: colors.black },
            ]}
          >
            <View style={[styles.pulseDot, { backgroundColor: colors.black }]} />
            <Text style={[styles.matchText, { color: colors.black }]}>
              ⚡ INSTANT PROXIMITY MATCH (&lt; 12 cm)
            </Text>
          </View>

          {/* User profile section */}
          <View style={styles.profileSection}>
            {profile?.avatarUrl ? (
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
            <Text style={[styles.headline, { color: colors.textSecondary }]}>{headline}</Text>
            {!!company && (
              <Text style={[styles.company, { color: colors.textTertiary }]}>🏢 {company}</Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.purple, borderColor: colors.black },
              ]}
              onPress={() => onViewProfile(user.deviceId)}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryBtnText, { color: colors.black }]}>
                View Full Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                { backgroundColor: colors.background, borderColor: colors.black },
              ]}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.black }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  modalCard: {
    width: '100%',
    borderRadius: spacing.radiusXl,
    padding: spacing.xl,
    borderWidth: 2.5,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radiusFull,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  matchText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
    borderWidth: 2.5,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: typography.xl,
    fontWeight: typography.extrabold,
  },
  name: {
    fontSize: typography.xl,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  headline: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginBottom: 4,
  },
  company: {
    fontSize: typography.sm,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm + 2,
  },
  primaryBtn: {
    paddingVertical: spacing.md + 2,
    borderRadius: spacing.radiusLg,
    alignItems: 'center',
    borderWidth: 2,
  },
  primaryBtnText: {
    fontWeight: typography.extrabold,
    fontSize: typography.base,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.radiusLg,
    alignItems: 'center',
    borderWidth: 2,
  },
  secondaryBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
  },
});
