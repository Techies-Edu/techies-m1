/**
 * UserCard — Modern Neo-Brutalist card with progressive profile rendering & dynamic theme support.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { NearbyUser } from '../types/ProfileTypes';
import { SkillTag } from './SkillTag';
import { useTheme, typography, spacing } from '../theme';

interface Props {
  user: NearbyUser;
  onPress: (deviceId: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const UserCardComponent: React.FC<Props> = ({ user, onPress }) => {
  const { colors } = useTheme();
  const { profile, deviceId } = user;

  const handlePress = () => onPress(deviceId);

  if (!profile) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.cardBorder,
            shadowColor: colors.primary,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <View style={styles.syncRow}>
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.secondary, borderColor: colors.secondary },
            ]}
          >
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
          <View style={styles.syncInfo}>
            <Text style={[styles.syncName, { color: colors.textPrimary }]}>
              Nearby Professional
            </Text>
            <Text style={[styles.syncSubtitle, { color: colors.textSecondary }]}>
              Loading profile…
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const isFullProfileLoaded = !!profile.headline || !!profile.company || profile.skills.length > 0;
  const topSkills = profile.skills.slice(0, 3);
  const displayName = profile.displayName || 'Nearby Professional';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          shadowColor: colors.primary,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Header row: avatar + name + headline/company */}
      <View style={styles.headerRow}>
        {profile.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            style={[styles.avatar, { borderColor: colors.cardBorder }]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.initialsAvatar,
              { backgroundColor: colors.secondary, borderColor: colors.secondary },
            ]}
          >
            <Text style={[styles.initials, { color: colors.primary }]}>
              {getInitials(displayName)}
            </Text>
          </View>
        )}

        <View style={styles.nameBlock}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>

          {isFullProfileLoaded ? (
            <>
              {!!profile.headline && (
                <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={1}>
                  {profile.headline}
                </Text>
              )}
              <View style={styles.metaRow}>
                {!!profile.company && (
                  <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
                    🏢 {profile.company}
                  </Text>
                )}
                {!!profile.college && !profile.company && (
                  <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
                    🎓 {profile.college}
                  </Text>
                )}
              </View>
            </>
          ) : (
            <View style={styles.syncSubtitleRow}>
              <ActivityIndicator
                size="small"
                color={colors.textSecondary}
                style={styles.miniSpinner}
              />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading profile…
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Skills */}
      {topSkills.length > 0 && (
        <View style={styles.skillsRow}>
          {topSkills.map((skill) => (
            <SkillTag key={skill} label={skill} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.radiusXl,
    padding: spacing.base + 2,
    marginBottom: spacing.base,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
    borderWidth: 2,
  },
  initialsAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    letterSpacing: 0.5,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
    paddingTop: 2,
  },
  name: {
    fontSize: typography.md + 1,
    fontWeight: typography.extrabold,
    marginBottom: 2,
  },
  headline: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    marginRight: spacing.sm,
  },
  syncSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniSpinner: {
    marginRight: 6,
    transform: [{ scale: 0.75 }],
  },
  loadingText: {
    fontSize: typography.xs + 1,
    fontWeight: typography.medium,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm + 2,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncInfo: {
    flex: 1,
  },
  syncName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    marginBottom: 4,
  },
  syncSubtitle: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
});

export const UserCard = React.memo(UserCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.user.deviceId === nextProps.user.deviceId &&
    prevProps.user.rssi === nextProps.user.rssi &&
    prevProps.user.profile?.hash === nextProps.user.profile?.hash &&
    prevProps.user.profile?.version === nextProps.user.profile?.version &&
    prevProps.user.profile?.updatedAt === nextProps.user.profile?.updatedAt
  );
});
