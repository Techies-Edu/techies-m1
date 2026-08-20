/**
 * ProfileLink — Neo-Brutalist tappable row for URLs with dynamic ThemeContext.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme, typography, spacing } from '../theme';
import LogService from '../services/LogService';

const TAG = 'ProfileLink';

interface Props {
  icon: string;
  label: string;
  value: string;
  url?: string;
}

export const ProfileLink: React.FC<Props> = ({ icon, label, value, url }) => {
  const { colors } = useTheme();

  if (!value || !value.trim()) return null;

  const handlePress = async () => {
    const target = url ?? value;
    try {
      const canOpen = await Linking.canOpenURL(target);
      if (canOpen) {
        await Linking.openURL(target);
      } else {
        LogService.warn(TAG, `Cannot open URL: ${target}`);
      }
    } catch (err) {
      LogService.error(TAG, `Failed to open URL: ${target}`, err);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.black,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: colors.blue, borderColor: colors.black }]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.labelText, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.valueText, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textPrimary }]}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radiusLg,
    marginBottom: spacing.sm + 2,
    borderWidth: 2.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  labelText: {
    fontSize: typography.xs,
    marginBottom: 2,
    fontWeight: typography.extrabold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: typography.sm,
    fontWeight: typography.extrabold,
  },
  chevron: {
    fontSize: 18,
    fontWeight: typography.extrabold,
    marginLeft: spacing.sm,
  },
});
