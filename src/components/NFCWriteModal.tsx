/**
 * NFCWriteModal — Neo-Brutalist UI Modal for programming Techies TechPass onto NFC tags.
 *
 * Implements full 5-stage write workflow:
 * 1. Instruction State ("Hold an NFC tag near the back of your phone")
 * 2. Detection & Safety Confirmation State ("Write TechPass to this NFC tag?")
 * 3. Writing State (Activity spinner & payload verification)
 * 4. Success State ("TechPass successfully written" + "Test TechPass" + "Write Another Tag")
 * 5. Error State (Actionable error handling for locked tags, disabled NFC, removal, etc.)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useTheme, typography, spacing } from '../theme';
import NFCWriter from '../services/nfc/NFCWriter';
import NFCService, { NFCTagInfo, NFCError } from '../services/nfc/NFCService';

export interface NFCWriteModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onTestTechPass: (userId: string) => void;
}

type ModalStep = 'INSTRUCTION' | 'CONFIRMATION' | 'WRITING' | 'SUCCESS' | 'ERROR';

export const NFCWriteModal: React.FC<NFCWriteModalProps> = ({
  visible,
  userId,
  onClose,
  onTestTechPass,
}) => {
  const { colors } = useTheme();

  const [step, setStep] = useState<ModalStep>('INSTRUCTION');
  const [tagInfo, setTagInfo] = useState<NFCTagInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');
  const [isNfcDisabled, setIsNfcDisabled] = useState<boolean>(false);

  // Pulse animation for scan instruction
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && step === 'INSTRUCTION') {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      return () => {
        pulseLoop.stop();
      };
    }
    return undefined;
  }, [visible, step, pulseAnim]);

  // Start tag detection when modal becomes visible or resets
  const startDetection = useCallback(async () => {
    setStep('INSTRUCTION');
    setTagInfo(null);
    setErrorMessage('');
    setErrorType('');
    setIsNfcDisabled(false);

    try {
      const { tagInfo: detectedTag } = await NFCWriter.scanForTag();
      setTagInfo(detectedTag);
      setStep('CONFIRMATION');
    } catch (err: unknown) {
      if (err instanceof NFCError) {
        if (err.type === 'CANCELLED') return; // User closed modal
        if (err.type === 'NFC_DISABLED') setIsNfcDisabled(true);
        setErrorType(err.type);
        setErrorMessage(err.message);
      } else {
        setErrorMessage((err as Error)?.message || 'Failed to detect NFC tag.');
      }
      setStep('ERROR');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      startDetection();
    } else {
      NFCWriter.cancel();
    }
  }, [visible, startDetection]);

  const handleConfirmWrite = async () => {
    if (!tagInfo) return;
    setStep('WRITING');

    try {
      const result = await NFCWriter.executeWrite(userId, tagInfo);
      if (result.success) {
        setStep('SUCCESS');
      } else {
        setErrorMessage(result.error || 'Write failed.');
        setStep('ERROR');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'Failed to write NFC tag.');
      setStep('ERROR');
    }
  };

  const handleClose = () => {
    NFCWriter.cancel();
    onClose();
  };

  const handleTestPass = () => {
    handleClose();
    onTestTechPass(userId);
  };

  const techPassUrl = NFCWriter.generateTechPassUrl(userId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.black,
              shadowColor: colors.black,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {step === 'INSTRUCTION' && 'NFC TechPass Writer'}
              {step === 'CONFIRMATION' && 'Confirm Overwrite'}
              {step === 'WRITING' && 'Writing TechPass...'}
              {step === 'SUCCESS' && 'TechPass Ready!'}
              {step === 'ERROR' && 'NFC Error'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 1. INSTRUCTION STATE */}
          {step === 'INSTRUCTION' && (
            <View style={styles.bodyContent}>
              <Animated.View
                style={[
                  styles.nfcIconCircle,
                  {
                    backgroundColor: colors.yellow,
                    borderColor: colors.black,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <Text style={styles.nfcEmoji}>📲</Text>
              </Animated.View>

              <Text style={[styles.instructionText, { color: colors.textPrimary }]}>
                Hold an NFC tag near the back of your phone.
              </Text>
              <Text style={[styles.subInstructionText, { color: colors.textSecondary }]}>
                Compatible with standard NTAG213, NTAG215, NTAG216, and Type 2 NFC tags.
              </Text>

              <View style={styles.scanningBadge}>
                <ActivityIndicator size="small" color={colors.black} />
                <Text style={styles.scanningText}>Listening for NFC tag...</Text>
              </View>

              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: colors.black }]}
                onPress={handleClose}
              >
                <Text style={[styles.btnTextSecondary, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 2. CONFIRMATION STATE */}
          {step === 'CONFIRMATION' && tagInfo && (
            <View style={styles.bodyContent}>
              <View
                style={[
                  styles.tagBadge,
                  { backgroundColor: colors.blue, borderColor: colors.black },
                ]}
              >
                <Text style={styles.tagBadgeText}>🏷️ NFC TAG DETECTED</Text>
              </View>

              <Text style={[styles.confirmationQuestion, { color: colors.textPrimary }]}>
                Write TechPass to this NFC tag?
              </Text>

              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.background, borderColor: colors.black },
                ]}
              >
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Target URL:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.purple }]} numberOfLines={1}>
                    {techPassUrl}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Tag Status:
                  </Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: tagInfo.isWritable ? colors.green : colors.error },
                    ]}
                  >
                    {tagInfo.isWritable ? 'Writable' : 'Locked / Read-Only'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Capacity:</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    {tagInfo.maxSize} Bytes
                  </Text>
                </View>
              </View>

              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                ⚠️ Any existing content on this NFC tag will be overwritten.
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btnSecondary, styles.btnFlex, { borderColor: colors.black }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.btnTextSecondary, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnPrimary,
                    styles.btnFlex,
                    { backgroundColor: colors.purple, borderColor: colors.black },
                  ]}
                  onPress={handleConfirmWrite}
                >
                  <Text style={[styles.btnTextPrimary, { color: colors.black }]}>
                    Confirm & Write
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 3. WRITING STATE */}
          {step === 'WRITING' && (
            <View style={styles.bodyContent}>
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color={colors.purple} />
              </View>
              <Text style={[styles.instructionText, { color: colors.textPrimary }]}>
                Programming TechPass NDEF Record...
              </Text>
              <Text style={[styles.subInstructionText, { color: colors.textSecondary }]}>
                Do not move the phone away from the tag.
              </Text>
            </View>
          )}

          {/* 4. SUCCESS STATE */}
          {step === 'SUCCESS' && (
            <View style={styles.bodyContent}>
              <View
                style={[
                  styles.nfcIconCircle,
                  { backgroundColor: colors.green, borderColor: colors.black },
                ]}
              >
                <Text style={styles.nfcEmoji}>✨</Text>
              </View>

              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                TechPass successfully written
              </Text>
              <Text style={[styles.subInstructionText, { color: colors.textSecondary }]}>
                Anyone can now tap this physical NFC tag with their phone to view your TechPass!
              </Text>

              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.background, borderColor: colors.black },
                ]}
              >
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Programmed Link:
                </Text>
                <Text style={[styles.infoValue, { color: colors.purple }]}>{techPassUrl}</Text>
              </View>

              <View style={styles.actionColumn}>
                <TouchableOpacity
                  style={[
                    styles.btnPrimary,
                    { backgroundColor: colors.yellow, borderColor: colors.black },
                  ]}
                  onPress={handleTestPass}
                >
                  <Text style={[styles.btnTextPrimary, { color: colors.black }]}>
                    🧪 Test TechPass
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnSecondary,
                    { backgroundColor: colors.blue, borderColor: colors.black },
                  ]}
                  onPress={startDetection}
                >
                  <Text style={[styles.btnTextSecondary, { color: colors.black }]}>
                    🔄 Write Another Tag
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnSecondary, { borderColor: colors.black }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.btnTextSecondary, { color: colors.textPrimary }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 5. ERROR STATE */}
          {step === 'ERROR' && (
            <View style={styles.bodyContent}>
              <View
                style={[
                  styles.nfcIconCircle,
                  { backgroundColor: colors.error, borderColor: colors.black },
                ]}
              >
                <Text style={styles.nfcEmoji}>⚠️</Text>
              </View>

              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                {errorType === 'READ_ONLY_TAG' ? 'Tag is Read-Only' : 'Write Operation Failed'}
              </Text>
              <Text style={[styles.errorMessageText, { color: colors.textPrimary }]}>
                {errorMessage}
              </Text>

              {isNfcDisabled && (
                <TouchableOpacity
                  style={[
                    styles.btnPrimary,
                    {
                      backgroundColor: colors.purple,
                      borderColor: colors.black,
                      marginBottom: spacing.sm,
                    },
                  ]}
                  onPress={() => NFCService.goToSettings()}
                >
                  <Text style={[styles.btnTextPrimary, { color: colors.black }]}>
                    ⚙️ Open NFC Settings
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btnSecondary, styles.btnFlex, { borderColor: colors.black }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.btnTextSecondary, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnPrimary,
                    styles.btnFlex,
                    { backgroundColor: colors.yellow, borderColor: colors.black },
                  ]}
                  onPress={startDetection}
                >
                  <Text style={[styles.btnTextPrimary, { color: colors.black }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: spacing.radiusXl,
    borderWidth: 3,
    padding: spacing.lg,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.lg,
    fontFamily: typography.serif,
    fontWeight: typography.bold,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: typography.bold,
  },
  bodyContent: {
    alignItems: 'center',
  },
  nfcIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  nfcEmoji: {
    fontSize: 34,
  },
  instructionText: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subInstructionText: {
    fontSize: typography.xs + 1,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  scanningText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  tagBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  tagBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.extrabold,
    letterSpacing: 0.5,
  },
  confirmationQuestion: {
    fontSize: typography.base + 1,
    fontWeight: typography.extrabold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  infoBox: {
    width: '100%',
    borderRadius: spacing.radiusMd,
    borderWidth: 2,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  infoValue: {
    fontSize: typography.xs,
    fontWeight: typography.extrabold,
  },
  warningText: {
    fontSize: typography.xs,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  spinnerContainer: {
    marginVertical: spacing.lg,
  },
  successTitle: {
    fontSize: typography.lg,
    fontWeight: typography.extrabold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorTitle: {
    fontSize: typography.lg,
    fontWeight: typography.extrabold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorMessageText: {
    fontSize: typography.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionColumn: {
    width: '100%',
    gap: spacing.sm,
  },
  btnFlex: {
    flex: 1,
  },
  btnPrimary: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextPrimary: {
    fontSize: typography.sm + 1,
    fontWeight: typography.extrabold,
  },
  btnSecondary: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radiusLg,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextSecondary: {
    fontSize: typography.sm + 1,
    fontWeight: typography.extrabold,
  },
});
