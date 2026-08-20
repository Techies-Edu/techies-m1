/**
 * QRScreen — Premium TechPass QR Code Display Screen.
 *
 * Shows the user's own Techies QR code (generated locally, offline-ready),
 * their identity summary, and quick actions to scan or share.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getMyProfile } from '../services/profile/ProfileStore';
import QRService from '../services/qr/QRService';
import { generateQRMatrix } from '../utils/qrGenerator';
import { UserProfile } from '../types/ProfileTypes';
import { useTheme } from '../theme';
import { spacing, typography } from '../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── QR SVG Renderer ──────────────────────────────────────────────────────────

interface QRSvgProps {
  matrix: boolean[][];
  size: number;
  moduleColor: string;
  lightColor: string;
  viewSize: number;
}

const QRSvg: React.FC<QRSvgProps> = React.memo(
  ({ matrix, size, moduleColor, lightColor, viewSize }) => {
    const ms = viewSize / size; // module size in pixels

    // Build a single SVG path for all dark modules (much faster than per-Rect)
    const pathData = useMemo(() => {
      let d = '';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c]) {
            const x = c * ms;
            const y = r * ms;
            d += `M${x},${y}h${ms}v${ms}h-${ms}z `;
          }
        }
      }
      return d;
    }, [matrix, size, ms]);

    return (
      <Svg width={viewSize} height={viewSize}>
        {/* Light background */}
        <Path d={`M0,0h${viewSize}v${viewSize}h-${viewSize}z`} fill={lightColor} />
        {/* Dark modules */}
        <Path d={pathData} fill={moduleColor} />
      </Svg>
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const QRScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load your profile.');
        setLoading(false);
      });
  }, []);

  // ── QR generation (synchronous, memoised) ──────────────────────────────────
  const qrData = useMemo(() => {
    if (!profile?.deviceId) {
      return null;
    }
    try {
      const payload = QRService.generateQRPayload(profile.deviceId);
      return generateQRMatrix(payload);
    } catch {
      return null;
    }
  }, [profile?.deviceId]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleScanQR = useCallback(() => {
    navigation.navigate('QRScannerScreen');
  }, [navigation]);

  const handleShare = useCallback(async () => {
    if (!profile?.deviceId) {
      return;
    }
    const url = QRService.generateQRPayload(profile.deviceId);
    const name = profile.displayName || profile.username || 'A Techie';
    try {
      await Share.share({
        message: `Connect with ${name} on Techies!\n${url}`,
        title: `${name}'s TechPass`,
      });
    } catch {
      // User dismissed — no-op
    }
  }, [profile]);

  // ── Render states ─────────────────────────────────────────────────────────
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (error || !profile || !qrData) {
      return (
        <View style={styles.centerBox}>
          <Text style={[styles.errorIcon]}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error ?? 'Could not generate QR code.'}
          </Text>
        </View>
      );
    }

    const displayName = profile.displayName || profile.username || 'Techie User';
    const subtitle = profile.headline || profile.category || 'Techies Member';

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* QR Card ─────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.qrCard,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.primary,
            },
          ]}
        >
          {/* Decorative top stripe */}
          <View style={styles.qrCardStripe} />

          {/* QR Code */}
          <View style={styles.qrWrapper}>
            <QRSvg
              matrix={qrData.matrix}
              size={qrData.size}
              moduleColor={colors.isDark ? '#FFFFFF' : '#1E1B4B'}
              lightColor={colors.isDark ? '#1E1B4B' : '#FFFFFF'}
              viewSize={244}
            />
          </View>

          {/* Divider */}
          <View style={[styles.qrDivider, { backgroundColor: colors.divider }]} />

          {/* User Identity */}
          <View style={styles.identityBlock}>
            <Text style={[styles.displayName, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.subline, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>

            {/* TechPass ID badge */}
            <View style={[styles.techPassBadge, { backgroundColor: colors.primaryDim }]}>
              <Text style={[styles.techPassId, { color: colors.primary }]}>
                {profile.techPassId || 'TP-••••-••••'}
              </Text>
            </View>
          </View>
        </View>

        {/* Scan hint */}
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Let others scan this to connect with you instantly
        </Text>

        {/* Action Row ─────────────────────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          {/* Scan QR Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.primary }]}
            onPress={handleScanQR}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionBtnIcon]}>📷</Text>
            <Text style={[styles.actionBtnLabel, { color: colors.primary }]}>Scan QR</Text>
          </TouchableOpacity>

          {/* Share TechPass Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnIcon}>🔗</Text>
            <Text style={[styles.actionBtnLabel, { color: '#FFFFFF' }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>TechPass QR</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Share your professional identity
          </Text>
        </View>

        {/* Spacer for symmetry */}
        <View style={styles.backBtn} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: typography.medium,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: 120,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorText: {
    fontSize: typography.base,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },

  // ── QR Card ───────────────────────────────────────────────────────────────
  qrCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: spacing.radiusXl,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  qrCardStripe: {
    height: 6,
    backgroundColor: '#4F46E5',
    width: '100%',
  },
  qrWrapper: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  qrDivider: {
    height: 1,
    marginHorizontal: spacing.xl,
  },
  identityBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  displayName: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    letterSpacing: -0.5,
  },
  subline: {
    fontSize: typography.sm,
  },
  techPassBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: spacing.radiusFull,
  },
  techPassId: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 1,
  },

  // ── Hint ─────────────────────────────────────────────────────────────────
  hint: {
    fontSize: typography.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    maxWidth: 340,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: spacing.radiusLg,
    gap: spacing.xs,
  },
  actionBtnOutline: {
    borderWidth: spacing.borderThin,
  },
  actionBtnFilled: {},
  actionBtnIcon: {
    fontSize: 16,
  },
  actionBtnLabel: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
