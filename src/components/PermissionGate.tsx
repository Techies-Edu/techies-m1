/**
 * PermissionGate — Neo-Brutalist rationale and action button if permissions are needed.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PermissionState } from '../types';
import { colors, typography, spacing } from '../theme';

interface PermissionGateProps {
  permissions: PermissionState;
  onRequestPermissions: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissions,
  onRequestPermissions,
}: PermissionGateProps) => {
  if (permissions.granted || permissions.checking) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Permissions Required</Text>
      <Text style={styles.description}>
        MeshConnect requires Bluetooth and Nearby Devices permissions to discover and connect with
        nearby phones automatically.
      </Text>

      <TouchableOpacity style={styles.button} onPress={onRequestPermissions} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Grant Permissions</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.yellow,
    padding: spacing.lg,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    borderColor: colors.black,
    marginBottom: spacing.base,
    shadowColor: colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  title: {
    fontSize: typography.md + 1,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sm,
    color: colors.black,
    fontWeight: typography.medium,
    lineHeight: 19,
    marginBottom: spacing.base,
  },
  button: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radiusLg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
  buttonText: {
    color: colors.black,
    fontSize: typography.sm,
    fontWeight: typography.extrabold,
  },
});
