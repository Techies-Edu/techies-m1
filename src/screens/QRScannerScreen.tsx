/**
 * QRScannerScreen — Full-Screen Native Camera QR Scanner.
 *
 * Uses react-native-camera-kit for real native camera access.
 * Resolves scanned deviceId → profile, then navigates to ProfileScreen.
 * Handles: camera permission, invalid QR, duplicate scan guard, and errors.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import QRService from '../services/qr/QRService';
import ProfileRegistry from '../services/profile/ProfileRegistry';
import { spacing, typography } from '../theme';


type NavProp = NativeStackNavigationProp<RootStackParamList>;

type ScannerState =
  | 'requesting' // asking for permission
  | 'denied' // permission denied
  | 'scanning' // active camera, waiting for QR
  | 'processing' // validating / resolving profile
  | 'error'; // bad QR or resolution failed

const CAMERA_PERMISSION: Permission =
  Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA;

const { width: SCREEN_W } = Dimensions.get('window');
const RETICLE_SIZE = Math.min(SCREEN_W * 0.68, 260);

// ─── Corner Reticle ───────────────────────────────────────────────────────────

const CornerBracket: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br';
}> = ({ position }) => {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';
  const CORNER = 24;
  const THICK = 3;
  const COLOR = '#FFFFFF';

  return (
    <View
      style={[
        styles.cornerBase,
        {
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
        },
      ]}
    >
      {/* Horizontal arm */}
      <View
        style={{
          position: 'absolute',
          width: CORNER,
          height: THICK,
          backgroundColor: COLOR,
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
        }}
      />
      {/* Vertical arm */}
      <View
        style={{
          position: 'absolute',
          width: THICK,
          height: CORNER,
          backgroundColor: COLOR,
          top: isTop ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
          left: isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
        }}
      />
    </View>
  );
};

// ─── Pulsing scan line ─────────────────────────────────────────────────────────

const ScanLine: React.FC = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, RETICLE_SIZE - 2],
  });

  return (
    <Animated.View
      style={[
        styles.scanLine,
        {
          width: RETICLE_SIZE - 24,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [state, setState] = useState<ScannerState>('requesting');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const scanLockRef = useRef(false);
  const errorDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Permission ────────────────────────────────────────────────────────────
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const status = await check(CAMERA_PERMISSION);
        if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
          setState('scanning');
          return;
        }
        if (status === RESULTS.DENIED) {
          const result = await request(CAMERA_PERMISSION);
          setState(result === RESULTS.GRANTED ? 'scanning' : 'denied');
        } else {
          setState('denied');
        }
      } catch {
        setState('denied');
      }
    };
    requestCameraPermission();
  }, []);

  // ── Cleanup timers ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (errorDismissTimer.current) {
        clearTimeout(errorDismissTimer.current);
      }
    };
  }, []);

  // ── Scan handler ──────────────────────────────────────────────────────────
  const handleReadCode = useCallback(
    async (event: { nativeEvent: { codeStringValue: string } }) => {
      const raw = event?.nativeEvent?.codeStringValue;

      // Duplicate scan guard (2-second lock)
      if (scanLockRef.current || !raw) {
        return;
      }
      scanLockRef.current = true;

      // ── Validate payload ────────────────────────────────────────────────
      const result = QRService.parseQRPayload(raw);

      if (!result.isValid || !result.deviceId) {
        setState('error');
        setErrorMsg('Not a Techies QR code');
        errorDismissTimer.current = setTimeout(() => {
          setState('scanning');
          scanLockRef.current = false;
        }, 2500);
        return;
      }

      setState('processing');

      const { deviceId } = result;

      // ── Resolve profile (check in-memory registry; ProfileScreen handles loading) ─
      const resolvedId = deviceId;
      void ProfileRegistry.getProfile(deviceId); // warm check only

      // ── Navigate ────────────────────────────────────────────────────────
      navigation.replace('Profile', { deviceId: resolvedId });
    },
    [navigation],
  );

  // ── Open settings helper ──────────────────────────────────────────────────
  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (state === 'denied') {
    return (
      <View style={[styles.root, { backgroundColor: '#0D0D0D' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.permissionBox}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permBody}>
            Allow Techies to use your camera to scan QR codes and connect with professionals nearby.
          </Text>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={handleOpenSettings}
            activeOpacity={0.85}
          >
            <Text style={styles.permBtnText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera (full screen) */}
      {(state === 'scanning' || state === 'processing' || state === 'error') && (
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode
          onReadCode={handleReadCode}
          flashMode="off"
          focusMode="on"
        />
      )}

      {/* Dark overlay outside reticle */}
      {state !== 'requesting' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Top overlay */}
          <View style={styles.overlayTop} />
          {/* Middle row: left + reticle + right */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            {/* Reticle frame */}
            <View style={styles.reticle}>
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
              {state === 'scanning' && <ScanLine />}
            </View>
            <View style={styles.overlaySide} />
          </View>
          {/* Bottom overlay */}
          <View style={styles.overlayBottom} />
        </View>
      )}

      {/* Back button (top-left) */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      {/* Title (top-center) */}
      <View style={styles.titleRow} pointerEvents="none">
        <Text style={styles.scanTitle}>Scan TechPass QR</Text>
      </View>

      {/* Instruction / status label (below reticle) */}
      <View style={styles.instructionRow} pointerEvents="none">
        {state === 'scanning' && (
          <Text style={styles.instructionText}>Point at a Techies QR code</Text>
        )}
        {state === 'processing' && (
          <Text style={styles.instructionText}>✓ QR detected — opening profile…</Text>
        )}
        {state === 'requesting' && (
          <Text style={styles.instructionText}>Requesting camera access…</Text>
        )}
        {state === 'error' && (
          <View style={styles.errorBubble}>
            <Text style={styles.errorBubbleText}>⚠ {errorMsg}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const OVERLAY_VERT = (Dimensions.get('window').height - RETICLE_SIZE) / 2 - 30;


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Back button ───────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute',
    top: 52,
    left: spacing.base,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  backArrow: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── Title row ─────────────────────────────────────────────────────────────
  titleRow: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  scanTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Dark overlay ──────────────────────────────────────────────────────────
  overlayTop: {
    height: OVERLAY_VERT,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  overlayMiddle: {
    height: RETICLE_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },

  // ── Reticle ───────────────────────────────────────────────────────────────
  reticle: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    position: 'relative',
    overflow: 'hidden',
  },
  cornerBase: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    top: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#4F46E5',
    opacity: 0.9,
  },

  // ── Instruction ───────────────────────────────────────────────────────────
  instructionRow: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  instructionText: {
    fontSize: typography.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  errorBubble: {
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusFull,
  },
  errorBubbleText: {
    fontSize: typography.sm,
    color: '#FFFFFF',
    fontWeight: typography.semibold,
  },

  // ── Permission denied state ────────────────────────────────────────────────
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  permIcon: {
    fontSize: 60,
    marginBottom: spacing.sm,
  },
  permTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permBody: {
    fontSize: typography.base,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  permBtn: {
    marginTop: spacing.lg,
    backgroundColor: '#4F46E5',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusFull,
  },
  permBtnText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
