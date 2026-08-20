/**
 * AuthScreen — Modern Neo-Brutalist Authentication Suite (Login, Register, Verification, Forgot Password).
 *
 * Implements strict password validation, role assignment (MEMBER / ORGANIZER), and session persistence.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AuthService, { validatePassword } from '../services/auth/AuthService';
import { AuthRole, UserSession } from '../types/AuthTypes';

interface AuthScreenProps {
  onAuthSuccess: (session: UserSession) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'VERIFY' | 'FORGOT_PASSWORD';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [role, setRole] = useState<AuthRole>('MEMBER');
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<string>('email');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Password rules validation helper for register
  const passRules = validatePassword(password);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const res = await AuthService.login(email, password);
      if (res.success && res.session) {
        onAuthSuccess(res.session);
      } else if (res.isUnverified) {
        setAuthMode('VERIFY');
        setErrorMsg(res.error || 'Verification code required.');
        AuthService.resendVerificationToken(email).then((r) => {
          if (r.token) setInfoMsg(`Verification code sent to ${email} (Code: ${r.token})`);
        });
      } else {
        setErrorMsg(res.error || 'Login failed.');
      }
    } catch (_) {
      setErrorMsg('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password !== confirmPassword && confirmPassword.length > 0) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!passRules.isValid) {
      setErrorMsg(passRules.message || 'Password does not meet requirements.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const res = await AuthService.register(email, password, role);
      if (res.success && res.account) {
        setAuthMode('VERIFY');
        const token = res.account.verificationToken || '123456';
        setInfoMsg(`Verification code sent to ${email}. (Code: ${token})`);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } catch (_) {
      setErrorMsg('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setErrorMsg('Please enter the verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await AuthService.verifyEmail(email, verificationCode);
      if (res.success) {
        setInfoMsg('Email verified successfully! Logging in...');
        const loginRes = await AuthService.login(email, password);
        if (loginRes.success && loginRes.session) {
          onAuthSuccess(loginRes.session);
        } else {
          setAuthMode('LOGIN');
          setInfoMsg('Email verified. Please log in.');
        }
      } else {
        setErrorMsg(res.error || 'Verification failed.');
      }
    } catch (_) {
      setErrorMsg('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your account email.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const res = await AuthService.requestPasswordReset(email);
      if (res.success) {
        setInfoMsg(`Password reset code generated: ${res.token}. You can now reset your password.`);
      } else {
        setErrorMsg(res.error || 'Request failed.');
      }
    } catch (_) {
      setErrorMsg('Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await AuthService.login('demo@techies.com', 'Demo1234!');
      if (res.success && res.session) {
        onAuthSuccess(res.session);
      } else {
        const regRes = await AuthService.register('demo@techies.com', 'Demo1234!', 'MEMBER');
        if (regRes.account) {
          await AuthService.verifyEmail(
            'demo@techies.com',
            regRes.account.verificationToken || '123456',
          );
          const loginRes = await AuthService.login('demo@techies.com', 'Demo1234!');
          if (loginRes.session) {
            onAuthSuccess(loginRes.session);
            return;
          }
        }
        onAuthSuccess({
          uid: 'demo-user-123',
          email: 'demo@techies.com',
          role: 'MEMBER',
          token: 'demo-test-token',
          expiresAt: Date.now() + 86400000,
        });
      }
    } catch (_) {
      onAuthSuccess({
        uid: 'demo-user-123',
        email: 'demo@techies.com',
        role: 'MEMBER',
        token: 'demo-test-token',
        expiresAt: Date.now() + 86400000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#00B069" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Green Header Area with Waves & Illustration */}
          <View style={styles.headerContainer}>
            {/* Top Back Navigation Arrow */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (authMode === 'REGISTER') setAuthMode('LOGIN');
                else if (authMode === 'FORGOT_PASSWORD' || authMode === 'VERIFY')
                  setAuthMode('LOGIN');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            {/* Decorative Leaves / Wave Curves */}
            <View style={styles.leafDecorLeft} />
            <View style={styles.leafDecorRight} />

            {/* Header Illustration */}
            <View style={styles.illustrationWrapper}>
              {authMode === 'REGISTER' ? (
                /* Register Header Graphic: Working on laptop */
                <View style={styles.illustrationBox}>
                  <View style={styles.hairGraphic} />
                  <View style={styles.personBody}>
                    <View style={styles.laptopGraphic} />
                    <View style={styles.coffeeCup} />
                  </View>
                </View>
              ) : (
                /* Login Header Graphic: Relaxing with tablet & coffee */
                <View style={styles.illustrationBox}>
                  <View style={styles.tabletPersonBody}>
                    <View style={styles.tabletGraphic} />
                    <View style={styles.booksGraphic} />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* White Rounded Form Sheet */}
          <View style={styles.formSheet}>
            {/* Title */}
            <Text style={styles.sheetTitle}>
              {authMode === 'REGISTER' && 'Create New Account'}
              {authMode === 'LOGIN' && 'Login to your account'}
              {authMode === 'FORGOT_PASSWORD' && 'Reset Password'}
              {authMode === 'VERIFY' && 'Email Verification'}
            </Text>

            {/* Error / Info Banners */}
            {!!errorMsg && (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>⚠️ {errorMsg}</Text>
              </View>
            )}

            {!!infoMsg && authMode !== 'VERIFY' && (
              <View style={styles.infoAlert}>
                <Text style={styles.infoAlertText}>ℹ️ {infoMsg}</Text>
              </View>
            )}

            {/* Social Logins Row */}
            {(authMode === 'LOGIN' || authMode === 'REGISTER') && (
              <>
                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialCircle} activeOpacity={0.8}>
                    <Text style={styles.facebookIcon}>f</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialCircle} activeOpacity={0.8}>
                    <Text style={styles.twitterIcon}>t</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialCircle} activeOpacity={0.8}>
                    <Text style={styles.googleIcon}>G+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.subtitleText}>or use your email account</Text>
              </>
            )}

            {/* EMAIL FIELD */}
            {(authMode === 'LOGIN' ||
              authMode === 'REGISTER' ||
              authMode === 'FORGOT_PASSWORD') && (
              <View style={styles.inputWrapper}>
                {focusedField === 'email' && (
                  <View style={styles.floatingBadge}>
                    <Text style={styles.floatingBadgeText}>Email</Text>
                  </View>
                )}
                <TextInput
                  style={[styles.input, focusedField === 'email' && styles.activeInput]}
                  placeholder={focusedField === 'email' ? 'name@ |' : 'Email'}
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* NAME FIELD (REGISTER ONLY) */}
            {authMode === 'REGISTER' && (
              <View style={styles.inputWrapper}>
                {focusedField === 'name' && (
                  <View style={styles.floatingBadge}>
                    <Text style={styles.floatingBadgeText}>Name</Text>
                  </View>
                )}
                <TextInput
                  style={[styles.input, focusedField === 'name' && styles.activeInput]}
                  placeholder="Name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField('')}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* PASSWORD FIELD */}
            {(authMode === 'LOGIN' || authMode === 'REGISTER') && (
              <View style={styles.inputWrapper}>
                {focusedField === 'password' && (
                  <View style={styles.floatingBadge}>
                    <Text style={styles.floatingBadgeText}>Password</Text>
                  </View>
                )}
                <TextInput
                  style={[styles.input, focusedField === 'password' && styles.activeInput]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField('')}
                  secureTextEntry
                />
              </View>
            )}

            {/* REGISTER CONFIRM PASSWORD & ROLE SELECTOR */}
            {authMode === 'REGISTER' && (
              <>
                <View style={styles.inputWrapper}>
                  {focusedField === 'confirmPassword' && (
                    <View style={styles.floatingBadge}>
                      <Text style={styles.floatingBadgeText}>Confirm Password</Text>
                    </View>
                  )}
                  <TextInput
                    style={[styles.input, focusedField === 'confirmPassword' && styles.activeInput]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField('')}
                    secureTextEntry
                  />
                </View>

                {/* Role Switch Pills */}
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[styles.rolePill, role === 'MEMBER' && styles.activeRolePill]}
                    onPress={() => setRole('MEMBER')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleText, role === 'MEMBER' && styles.activeRoleText]}>
                      👤 Member
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rolePill, role === 'ORGANIZER' && styles.activeRolePill]}
                    onPress={() => setRole('ORGANIZER')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleText, role === 'ORGANIZER' && styles.activeRoleText]}>
                      🎪 Organizer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* LOGIN CONTROLS ROW (Remember Me & Forgot Password) */}
            {authMode === 'LOGIN' && (
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.toggleTrack, rememberMe && styles.toggleTrackActive]}>
                    <View style={[styles.toggleThumb, rememberMe && styles.toggleThumbActive]} />
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAuthMode('FORGOT_PASSWORD')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* VERIFY CODE INPUT */}
            {authMode === 'VERIFY' && (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.activeInput]}
                  placeholder="123456 (6-digit code)"
                  placeholderTextColor="#9CA3AF"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            )}

            {/* MAIN GREEN ACTION BUTTON */}
            <TouchableOpacity
              style={[styles.greenButton, loading && styles.disabledBtn]}
              onPress={() => {
                if (authMode === 'LOGIN') handleLogin();
                else if (authMode === 'REGISTER') handleRegister();
                else if (authMode === 'VERIFY') handleVerify();
                else if (authMode === 'FORGOT_PASSWORD') handleForgotPassword();
              }}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.greenButtonText}>
                  {authMode === 'LOGIN' && 'LOGIN'}
                  {authMode === 'REGISTER' && 'REGISTER'}
                  {authMode === 'VERIFY' && 'VERIFY EMAIL'}
                  {authMode === 'FORGOT_PASSWORD' && 'SEND RESET CODE'}
                </Text>
              )}
            </TouchableOpacity>

            {/* QUICK DIRECT TEST ENTRY BUTTON */}
            <TouchableOpacity
              style={styles.quickTestButton}
              onPress={handleQuickDemoLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.quickTestButtonText}>⚡ Quick Test Entry (Skip Login)</Text>
            </TouchableOpacity>

            {/* FOOTER SWITCH LINK */}
            <View style={styles.footerRow}>
              {authMode === 'REGISTER' && (
                <TouchableOpacity onPress={() => setAuthMode('LOGIN')}>
                  <Text style={styles.footerNormalText}>
                    Already have an account? <Text style={styles.footerGreenText}>Login here</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {authMode === 'LOGIN' && (
                <TouchableOpacity onPress={() => setAuthMode('REGISTER')}>
                  <Text style={styles.footerNormalText}>
                    Don't have an account? <Text style={styles.footerGreenText}>Register here</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {(authMode === 'VERIFY' || authMode === 'FORGOT_PASSWORD') && (
                <TouchableOpacity onPress={() => setAuthMode('LOGIN')}>
                  <Text style={styles.footerGreenText}>← Back to Login</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* EMAIL CONFIRMATION MODAL */}
      {authMode === 'VERIFY' && (
        <View style={styles.modalOverlay}>
          <View style={styles.greenModalCard}>
            {/* Top envelope graphic with yellow open flap & checkmark badge */}
            <View style={styles.envelopeGraphicBox}>
              <View style={styles.envelopeBody}>
                <View style={styles.envelopeFlap} />
                <View style={styles.checkBadge}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              </View>
            </View>

            <Text style={styles.modalTitle}>Thank you for your registration!</Text>

            <Text style={styles.modalBodyText}>
              We're glad you're here! Before you start exploring, we just sent you the email
              confirmation.
            </Text>

            <TouchableOpacity
              style={styles.blackResendButton}
              onPress={() => {
                if (email) {
                  AuthService.resendVerificationToken(email).then((r) => {
                    if (r.token) setInfoMsg(`Code resent: ${r.token}`);
                  });
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.blackResendText}>Resend email confirmation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseLink}
              onPress={() => setAuthMode('LOGIN')}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Dismiss & Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00B069',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    height: 220,
    backgroundColor: '#00B069',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backArrow: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  leafDecorLeft: {
    position: 'absolute',
    left: -20,
    top: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  leafDecorRight: {
    position: 'absolute',
    right: -10,
    top: 60,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationBox: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hairGraphic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F59E0B',
    marginBottom: -20,
  },
  personBody: {
    width: 90,
    height: 60,
    backgroundColor: '#0D9488',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laptopGraphic: {
    width: 50,
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  coffeeCup: {
    position: 'absolute',
    right: -12,
    bottom: 8,
    width: 14,
    height: 18,
    backgroundColor: '#374151',
    borderRadius: 3,
  },
  tabletPersonBody: {
    width: 90,
    height: 70,
    backgroundColor: '#059669',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabletGraphic: {
    width: 44,
    height: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  booksGraphic: {
    width: 50,
    height: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    marginTop: 6,
  },
  formSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    marginTop: -20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorAlert: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  infoAlert: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoAlertText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 12,
  },
  socialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  facebookIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B5998',
  },
  twitterIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1DA1F2',
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DD4B39',
  },
  subtitleText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 16,
    position: 'relative',
  },
  floatingBadge: {
    position: 'absolute',
    top: -9,
    left: 14,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
  },
  floatingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00B069',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  activeInput: {
    borderColor: '#00B069',
    borderWidth: 1.5,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rolePill: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  activeRolePill: {
    borderColor: '#00B069',
    backgroundColor: '#ECFDF5',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeRoleText: {
    color: '#00B069',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTrack: {
    width: 38,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    padding: 2,
    marginRight: 8,
  },
  toggleTrackActive: {
    backgroundColor: '#00B069',
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    marginLeft: 18,
  },
  rememberText: {
    fontSize: 13,
    color: '#6B7280',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00B069',
  },
  greenButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00B069',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#00B069',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  greenButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerNormalText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  footerGreenText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B069',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  greenModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#00B069',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  envelopeGraphicBox: {
    width: 70,
    height: 60,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeBody: {
    width: 58,
    height: 42,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeFlap: {
    position: 'absolute',
    top: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 29,
    borderRightWidth: 29,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FBBF24',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00B069',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  modalBodyText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  blackResendButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  blackResendText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseLink: {
    paddingVertical: 6,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  quickTestButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#00B069',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quickTestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B069',
  },
});
