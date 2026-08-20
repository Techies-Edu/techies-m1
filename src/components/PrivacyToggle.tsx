/**
 * PrivacyToggle — Neo-Brutalist inline toggle switch for field visibility (VISIBLE / HIDDEN).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PrivacyState } from '../types/ProfileTypes';
import { useTheme, typography, spacing } from '../theme';

interface PrivacyToggleProps {
  label: string;
  value: PrivacyState;
  onChange: (newValue: PrivacyState) => void;
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({ label, value, onChange }) => {
  const { colors } = useTheme();
  const isVisible = value === 'VISIBLE';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.pill,
          {
            backgroundColor: isVisible ? colors.green : colors.surface,
            borderColor: colors.black,
          },
        ]}
        onPress={() => onChange(isVisible ? 'HIDDEN' : 'VISIBLE')}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillText, { color: colors.black }]}>
          {isVisible ? '👁️ VISIBLE' : '🔒 HIDDEN'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.xs + 1,
    fontWeight: typography.bold,
    flex: 1,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
    borderWidth: 2,
  },
  pillText: {
    fontSize: typography.xs,
    fontWeight: typography.extrabold,
    letterSpacing: 0.5,
  },
});
