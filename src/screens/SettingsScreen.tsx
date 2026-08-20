/**
 * SettingsScreen — Complete Account, Security, Privacy, Notifications, and System Settings Suite.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AuthService, { validatePassword } from '../services/auth/AuthService';
import * as ProfileStore from '../services/profile/ProfileStore';
import { DEFAULT_PRIVACY_SETTINGS } from '../services/profile/PrivacyService';
import NotificationService from '../services/notification/NotificationService';
import { UserProfile, ProfilePrivacyMap, PrivacyState } from '../types/ProfileTypes';
import { NotificationPreferences } from '../types/NotificationTypes';
import { useTheme, spacing } from '../theme';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode, colors, toggleTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privacy, setPrivacy] = useState<ProfilePrivacyMap>({ ...DEFAULT_PRIVACY_SETTINGS });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    enableConnectionAlerts: true,
    enableEventAlerts: true,
    enableCheckInAlerts: true,
    enableMarketing: false,
  });

  // Security: Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const prof = await ProfileStore.getMyProfile();
      if (prof) {
        setProfile(prof);
        setPrivacy({ ...DEFAULT_PRIVACY_SETTINGS, ...(prof.privacySettings || {}) });
      }

      const prefs = await NotificationService.getPreferences();
      setNotifPrefs(prefs);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFieldPrivacy = async (fieldKey: string) => {
    if (!profile) return;
    const currentVal: PrivacyState = privacy[fieldKey] || 'VISIBLE';
    const newVal: PrivacyState = currentVal === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';

    const updatedMap = { ...privacy, [fieldKey]: newVal };
    setPrivacy(updatedMap);

    const updatedProfile: UserProfile = {
      ...profile,
      privacySettings: updatedMap,
      updatedAt: Date.now(),
    };

    setProfile(updatedProfile);
    await ProfileStore.saveMyProfile(updatedProfile);
  };

  const handleUpdateNotifPref = async (key: keyof NotificationPreferences, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    await NotificationService.updatePreferences(updated);
  };

  const handleChangePassword = async () => {
    if (!profile || !newPassword) return;

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.isValid) {
      Alert.alert('Weak Password', passCheck.message);
      return;
    }

    setPassLoading(true);
    try {
      const session = await AuthService.getCurrentSession();
      if (session) {
        const res = await AuthService.resetPassword(session.email, '', newPassword);
        if (res.success) {
          Alert.alert('Password Updated', 'Your password has been changed successfully.');
          setShowPasswordChange(false);
          setNewPassword('');
          setConfirmPassword('');
        } else {
          Alert.alert('Error', res.error || 'Failed to change password.');
        }
      }
    } catch (_) {
      Alert.alert('Error', 'Password update failed.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Techies?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigation.reset({ index: 0, routes: [{ name: 'Auth' as any }] });
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'CAUTION: This will permanently delete your TechPass, connections, event registrations, and session data. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            if (profile) {
              await AuthService.deleteAccount(profile.email);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              navigation.reset({ index: 0, routes: [{ name: 'Auth' as any }] });
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="#F8F9FE"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large White Rounded Content Card */}
        <View style={styles.cardContainer}>
          {/* Top Bar (Grid Icon + Avatar) */}
          <View style={styles.topBar}>
            <View style={styles.gridIconCircle}>
              <Text style={styles.gridIconText}>∷</Text>
            </View>

            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => navigation.navigate('MyProfile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarEmoji}>👤</Text>
            </TouchableOpacity>
          </View>

          {/* Page Title */}
          <Text style={styles.pageTitle}>Settings</Text>

          {/* SECTION 1: GENERAL */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Text style={styles.sectionIconEmoji}>⚙️</Text>
              </View>
              <Text style={styles.sectionHeaderTitle}>General</Text>
            </View>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Dark Theme</Text>
                <Text style={styles.settingSubLabel}>Toggle soft dark mode palette</Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ true: '#4F46E5', false: '#E5E7EB' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Connection Notifications</Text>
                <Text style={styles.settingSubLabel}>Alerts for nearby connections</Text>
              </View>
              <Switch
                value={notifPrefs.enableConnectionAlerts}
                onValueChange={(val) => handleUpdateNotifPref('enableConnectionAlerts', val)}
                trackColor={{ true: '#4F46E5', false: '#E5E7EB' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <Text style={styles.settingLabel}>App Language</Text>
              <Text style={styles.valueText}>English ›</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 2: NETWORKING */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Text style={styles.sectionIconEmoji}>📡</Text>
              </View>
              <Text style={styles.sectionHeaderTitle}>Networking</Text>
            </View>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Bluetooth Check-In Alerts</Text>
                <Text style={styles.settingSubLabel}>Notify when entering peer range</Text>
              </View>
              <Switch
                value={notifPrefs.enableCheckInAlerts}
                onValueChange={(val) => handleUpdateNotifPref('enableCheckInAlerts', val)}
                trackColor={{ true: '#4F46E5', false: '#E5E7EB' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.linkRow}>
              <Text style={styles.settingLabel}>Bluetooth BLE</Text>
              <Text style={styles.statusActive}>● Active</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.linkRow}>
              <Text style={styles.settingLabel}>Wi-Fi Direct P2P</Text>
              <Text style={styles.statusReady}>Ready</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.linkRow}>
              <Text style={styles.settingLabel}>NFC / TechPass</Text>
              <Text style={styles.statusReady}>Supported</Text>
            </View>
          </View>

          {/* SECTION 3: PRIVACY & FIELD VISIBILITY */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Text style={styles.sectionIconEmoji}>🛡️</Text>
              </View>
              <Text style={styles.sectionHeaderTitle}>Privacy</Text>
            </View>

            <Text style={styles.privacyDescText}>
              Fields set to HIDDEN are automatically stripped from BLE advertisements, QR codes, and
              NFC reads.
            </Text>

            {[
              { key: 'email', label: 'Email Address' },
              { key: 'phone', label: 'Phone Number' },
              { key: 'bio', label: 'Professional Bio' },
              { key: 'skills', label: 'Skills & Tech Stack' },
              { key: 'github', label: 'GitHub Link' },
              { key: 'linkedin', label: 'LinkedIn Link' },
              { key: 'portfolio', label: 'Portfolio Website' },
              { key: 'resume', label: 'Resume URL' },
            ].map((item, idx, arr) => (
              <React.Fragment key={item.key}>
                <View style={styles.privacyRow}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <TouchableOpacity
                    style={[
                      styles.privacyPill,
                      privacy[item.key] === 'VISIBLE'
                        ? styles.privacyVisiblePill
                        : styles.privacyHiddenPill,
                    ]}
                    onPress={() => handleToggleFieldPrivacy(item.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.privacyPillText,
                        privacy[item.key] === 'VISIBLE'
                          ? styles.privacyVisibleText
                          : styles.privacyHiddenText,
                      ]}
                    >
                      {privacy[item.key] === 'VISIBLE' ? '👁️ VISIBLE' : '🔒 HIDDEN'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {idx < arr.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          {/* SECTION 4: ACCOUNT & ACTIONS */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Text style={styles.sectionIconEmoji}>👤</Text>
              </View>
              <Text style={styles.sectionHeaderTitle}>Account</Text>
            </View>

            {!showPasswordChange ? (
              <TouchableOpacity
                style={styles.blackPillButton}
                onPress={() => setShowPasswordChange(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.blackPillButtonText}>Change Password 🔒</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New password..."
                  placeholderTextColor="#9CA3AF"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />

                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password..."
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowPasswordChange(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleChangePassword}
                    disabled={passLoading}
                  >
                    {passLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.logoutOutlineButton}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <Text style={styles.logoutOutlineText}>Logout ↪</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteLink}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteLinkText}>Permanently Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* Legal Footer */}
          <Text style={styles.legalFooterText}>
            Review our <Text style={styles.legalBold}>Privacy Policy</Text> and{' '}
            <Text style={styles.legalBold}>Terms of Services</Text>. Tap to change your consent
            settings anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: spacing.md,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    marginHorizontal: 16,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 36,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconText: {
    fontSize: 20,
    color: '#1F2937',
    fontWeight: 'bold',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE57E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 24,
  },
  sectionBlock: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionIconEmoji: {
    fontSize: 16,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  settingSubLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  valueText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statusActive: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  statusReady: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  privacyDescText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  privacyPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  privacyVisiblePill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  privacyHiddenPill: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  privacyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  privacyVisibleText: {
    color: '#059669',
  },
  privacyHiddenText: {
    color: '#6B7280',
  },
  blackPillButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  blackPillButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutOutlineButton: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  logoutOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  deleteLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  deleteLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  passwordForm: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legalFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  legalBold: {
    fontWeight: '700',
    color: '#6B7280',
  },
});
