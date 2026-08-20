/**
 * ConnectionCard — Neo-Brutalist Card displaying saved connection with social link launchers.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Connection } from '../types/ConnectionTypes';
import { SkillTag } from './SkillTag';
import { useTheme, typography, spacing } from '../theme';

interface ConnectionCardProps {
  connection: Connection;
  onPress: () => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({ connection, onPress }) => {
  const { colors } = useTheme();
  const profile = connection.snapshot;

  const dateStr = new Date(connection.connectedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const openUrl = (url?: string) => {
    if (!url) return;
    const clean = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(clean).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.black,
          shadowColor: colors.black,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerTitleArea}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.displayName}</Text>
          <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={1}>
            {profile.headline || profile.designation || 'Techies Professional'}
          </Text>
        </View>

        <View
          style={[
            styles.methodBadge,
            { backgroundColor: colors.yellow, borderColor: colors.black },
          ]}
        >
          <Text style={styles.methodBadgeText}>
            {connection.method === 'Bluetooth' && '📡 BLE'}
            {connection.method === 'QR' && '🏁 QR'}
            {connection.method === 'NFC' && '🎴 NFC'}
          </Text>
        </View>
      </View>

      {!!profile.company && (
        <Text style={[styles.meta, { color: colors.textTertiary }]}>🏢 {profile.company}</Text>
      )}

      {profile.skills && profile.skills.length > 0 && (
        <View style={styles.skillsRow}>
          {profile.skills.slice(0, 3).map((skill) => (
            <SkillTag key={skill} label={skill} variant="skill" />
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>
          Connected on {dateStr}
        </Text>

        <View style={styles.socialRow}>
          {!!profile.github && (
            <TouchableOpacity
              style={[
                styles.socialBtn,
                { backgroundColor: colors.purple, borderColor: colors.black },
              ]}
              onPress={() => openUrl(profile.github)}
              activeOpacity={0.8}
            >
              <Text style={styles.socialIcon}>⌨️</Text>
            </TouchableOpacity>
          )}
          {!!profile.linkedin && (
            <TouchableOpacity
              style={[
                styles.socialBtn,
                { backgroundColor: colors.blue, borderColor: colors.black },
              ]}
              onPress={() => openUrl(profile.linkedin)}
              activeOpacity={0.8}
            >
              <Text style={styles.socialIcon}>💼</Text>
            </TouchableOpacity>
          )}
          {!!profile.portfolio && (
            <TouchableOpacity
              style={[
                styles.socialBtn,
                { backgroundColor: colors.yellow, borderColor: colors.black },
              ]}
              onPress={() => openUrl(profile.portfolio)}
              activeOpacity={0.8}
            >
              <Text style={styles.socialIcon}>🌐</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.radiusLg,
    borderWidth: 3,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitleArea: {
    flex: 1,
    marginRight: spacing.xs,
  },
  name: {
    fontSize: typography.base + 1,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
  },
  headline: {
    fontSize: typography.xs + 1,
    fontWeight: typography.medium,
  },
  methodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
  },
  methodBadgeText: {
    fontSize: typography.xs - 1,
    fontWeight: typography.extrabold,
  },
  meta: {
    fontSize: typography.xs,
    marginBottom: spacing.xs + 2,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingTop: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  dateText: {
    fontSize: typography.xs - 1,
    fontWeight: typography.bold,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  socialBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    fontSize: 14,
  },
});
