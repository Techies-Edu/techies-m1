/**
 * ErrorBanner — Neo-Brutalist dismissible alert bar for status notifications.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface ErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
  type?: 'error' | 'success' | 'warning';
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  type = 'error',
}: ErrorBannerProps) => {
  if (!message) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { bg: colors.green };
      case 'warning':
        return { bg: colors.yellow };
      default:
        return { bg: colors.pink };
    }
  };

  const currentStyle = getTypeStyles();

  return (
    <View style={[styles.banner, { backgroundColor: currentStyle.bg }]}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md + 2,
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
    borderColor: colors.black,
    marginBottom: spacing.base,
  },
  text: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.black,
    marginRight: spacing.sm,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: typography.md,
    fontWeight: typography.extrabold,
    color: colors.black,
  },
});
