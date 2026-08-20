/**
 * SkillTag — Neo-Brutalist chip for skill or interest label with ThemeContext.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography, spacing } from '../theme';

interface Props {
  label: string;
  variant?: 'skill' | 'interest';
}

export const SkillTag: React.FC<Props> = ({ label, variant = 'skill' }) => {
  const { colors } = useTheme();
  const isSkill = variant === 'skill';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isSkill ? colors.primaryDim : colors.secondary,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <Text style={[styles.label, { color: isSkill ? colors.primary : colors.textPrimary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
    borderRadius: spacing.radiusFull,
    marginRight: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
});
