/**
 * ConsentModal — Mutual Consent Modal for Bluetooth Nearby Connections.
 *
 * Enforces rule: Connection is created ONLY after explicit user consent (Accept / Decline).
 */
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserProfile } from '../types/ProfileTypes';
import { useTheme, typography, spacing } from '../theme';

interface ConsentModalProps {
  visible: boolean;
  peerProfile: UserProfile | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  visible,
  peerProfile,
  onAccept,
  onDecline,
}) => {
  const { colors } = useTheme();

  if (!peerProfile) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.cardBorder,
              shadowColor: colors.primary,
            },
          ]}
        >
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.primaryDim, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.primary }]}>
              📡 NEARBY BLE DETECTION
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Connect with Nearby Techie?
          </Text>

          <View
            style={[
              styles.profileBox,
              { backgroundColor: colors.secondary, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {peerProfile.displayName}
            </Text>
            {!!peerProfile.headline && (
              <Text style={[styles.headline, { color: colors.textSecondary }]}>
                {peerProfile.headline}
              </Text>
            )}
            {!!peerProfile.company && (
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                🏢 {peerProfile.company}
              </Text>
            )}
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Explicit mutual consent required. Both users must accept to exchange contacts.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.declineBtn,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              ]}
              onPress={onDecline}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: colors.textPrimary }]}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.acceptBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: colors.white }]}>🤝 Accept & Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: spacing.radiusXxl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: spacing.radiusFull,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: typography.xs - 1,
    fontWeight: typography.extrabold,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: typography.lg,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  profileBox: {
    width: '100%',
    borderRadius: spacing.radiusLg,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    fontSize: typography.base + 1,
    fontWeight: typography.extrabold,
    marginBottom: 2,
  },
  headline: {
    fontSize: typography.xs + 1,
    textAlign: 'center',
    marginBottom: 2,
  },
  meta: {
    fontSize: typography.xs,
  },
  hint: {
    fontSize: typography.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {},
  acceptBtn: {},
  btnText: {
    fontSize: typography.sm,
    fontWeight: typography.extrabold,
  },
});
