/**
 * StatusIndicator — Neo-Brutalist indicator chip with status text and dynamic ThemeContext.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography, spacing } from '../theme';

interface StatusIndicatorProps {
  label: string;
  statusText: string;
  color: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  statusText,
  color,
}: StatusIndicatorProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.black,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: color, borderColor: colors.black }]} />
        <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
          {statusText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: spacing.radiusMd,
    marginHorizontal: spacing.xs,
    borderWidth: 2,
  },
  label: {
    fontSize: typography.xs - 1,
    fontWeight: typography.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
    borderWidth: 1,
  },
  value: {
    fontSize: typography.xs + 1,
    fontWeight: typography.extrabold,
  },
});
