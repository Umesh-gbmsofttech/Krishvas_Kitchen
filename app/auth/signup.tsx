import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/config/appConfig';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { LoadingButton } from '../../src/components/LoadingButton';

export default function SignupScreen() {
  const { signup, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState('');
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

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setProfileImageUri(result.assets[0].uri);
  };

  const handleSignup = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      setError('');
      await signup({ fullName: fullName.trim(), email: email.trim(), password, phone: phone.trim() });
      if (profileImageUri) {
        await api.uploadProfileImage({ uri: profileImageUri, name: `profile-${Date.now()}.jpg`, type: 'image/jpeg' });
        await refreshProfile();
      }
      router.replace('/home');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container} {...topPullResponder.panHandlers}>
      <StatusBar style="light" backgroundColor={COLORS.accent} translucent hidden={statusBarHidden} />
      <Pressable style={[styles.skipBtn, { top: insets.top + 8 }]} onPress={() => router.replace('/home')}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
      <Text style={styles.title}>Create Account</Text>

      <Pressable style={styles.imagePicker} onPress={pickProfileImage}>
        <Image source={profileImageUri ? { uri: profileImageUri } : require('../../assets/images/mutton.jpg')} style={styles.imagePreview} />
        <Text style={styles.imageLabel}>Profile Image</Text>
      </Pressable>

      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full Name" />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />

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

      {!!error && <Text style={styles.error}>{error}</Text>}
      <LoadingButton title="Signup" loadingTitle="Submitting" loading={submitting} onPress={handleSignup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
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
  title: { fontSize: 28, fontWeight: '900', marginBottom: 14, color: COLORS.text , textAlign: 'center'},
  imagePicker: { alignItems: 'center', marginBottom: 12 },
  imagePreview: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: '#fff' },
  imageLabel: { marginTop: 6, color: COLORS.accent, fontWeight: '700' },
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
  error: { color: COLORS.danger, marginBottom: 8 },
});

