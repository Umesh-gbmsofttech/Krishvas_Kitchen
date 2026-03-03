import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/config/appConfig';
import { useAuth } from '../../src/context/AuthContext';
import { LoadingButton } from '../../src/components/LoadingButton';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { KeyboardScreen } from '../../src/components/KeyboardScreen';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusBarHidden, setStatusBarHidden] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const showStatusBarTemporarily = () => {
    setStatusBarHidden(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setStatusBarHidden(true), 1200);
  };

  const topPullResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
          const movingDown = gestureState.dy > 14;
          const mostlyVertical = Math.abs(gestureState.dx) < 20;
          const nearTopEdge = gestureState.moveY < 85;
          return movingDown && mostlyVertical && nearTopEdge;
        },
        onPanResponderRelease: () => {
          showStatusBarTemporarily();
        },
      }),
    []
  );

  const handleLogin = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setError('');
      await login(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardScreen containerStyle={styles.container} contentContainerStyle={styles.content} {...topPullResponder.panHandlers}>
      <StatusBar style="light" backgroundColor={COLORS.accent} translucent hidden={statusBarHidden} />
      <Pressable style={[styles.skipBtn, { top: insets.top + 8 }]} onPress={() => router.replace('/home')}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
      <Text style={styles.title}>Welcome to {`Krishva's Kitchen`}</Text>
      <Text style={styles.subtitle}>Login to place orders, track delivery, and manage dashboards.</Text>

      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />

      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry={!showPassword}
        />
        <Pressable style={styles.toggleBtn} onPress={() => setShowPassword((v) => !v)}>
          <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => {}}>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </Pressable>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <LoadingButton title="Login" loadingTitle="Submitting" loading={submitting} onPress={handleLogin} />

      <Link href="/auth/signup" style={styles.link}>Create account</Link>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24, justifyContent: 'center' },
  skipBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipText: { color: COLORS.accent, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text , textAlign: 'center'},
  subtitle: { color: COLORS.muted, marginTop: 8, marginBottom: 20 , textAlign: 'center'},
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  passwordRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 12 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0f0f0' },
  toggleText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  forgot: { color: COLORS.accent, textAlign: 'right', fontWeight: '700', marginBottom: 10 },
  link: { marginTop: 14, color: COLORS.accent, fontWeight: '700' },
  error: { color: COLORS.danger, marginBottom: 8 },
});

