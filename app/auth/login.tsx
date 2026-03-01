import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../src/config/appConfig';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('admin@krishvaskitchen.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      await login(email, password);
      router.replace('/');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to {`Krishva's Kitchen`}</Text>
      <Text style={styles.subtitle}>Login to place orders, track delivery, and manage dashboards.</Text>

      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Login</Text>
      </Pressable>

      <Link href="/auth/signup" style={styles.link}>Create account</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  subtitle: { color: COLORS.muted, marginTop: 8, marginBottom: 20 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { marginTop: 14, color: COLORS.accent, fontWeight: '700' },
  error: { color: COLORS.danger, marginBottom: 8 },
});
