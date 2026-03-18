import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize } from '../lib/theme';
import { authApi } from '../lib/api';
import { RootStackParamList } from '../lib/types';

const appLogo = require('../../assets/logo.jpg');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: '', color: 'transparent', width: '0%' };
  if (password.length < 6) return { label: 'Too short', color: '#ef4444', width: '25%' };
  if (password.length < 8) return { label: 'Weak', color: '#f97316', width: '40%' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score === 3) return { label: 'Strong', color: '#22c55e', width: '100%' };
  if (score === 2) return { label: 'Good', color: '#84cc16', width: '75%' };
  return { label: 'Fair', color: '#eab308', width: '55%' };
}

export default function SignupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignup = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.signup(email.trim(), password, displayName.trim());
      // FIX: after signup → show email verification alert → navigate to Login
      // Do NOT auto-login — Supabase requires email confirmation first
      Alert.alert(
        'Check Your Email',
        'We sent a confirmation link to ' + email.trim() + '. Please verify your email before signing in.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>Ngumu's Eye</Text>
            <Text style={styles.subtitle}>Community Safety Platform</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Join the community safety network</Text>

            {/* Display Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Create password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {/* Password strength bar */}
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarBg}>
                    <View style={[styles.strengthBarFill, {
                      width: passwordStrength.width as any,
                      backgroundColor: passwordStrength.color,
                    }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[
                styles.passwordContainer,
                passwordsMismatch && styles.inputError,
                passwordsMatch && styles.inputSuccess,
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {passwordsMismatch && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
              {passwordsMatch && (
                <Text style={styles.successText}>Passwords match ✓</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Already have account */}
            <View style={styles.signinRow}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.signinLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.cardForeground,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  formContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.cardForeground,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputSuccess: {
    borderColor: '#22c55e',
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.cardForeground,
  },
  eyeButton: {
    padding: spacing.md,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.muted,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 50,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.primaryForeground,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signinText: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
  },
  signinLink: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
