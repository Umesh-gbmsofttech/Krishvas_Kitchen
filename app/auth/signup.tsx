import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../src/config/appConfig';
import { useAuth } from '../../src/context/AuthContext';

export default function SignupScreen() {
  const { signup } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('Naveed Khan');
  const [email, setEmail] = useState(`naveed${Date.now().toString().slice(-4)}@mail.com`);
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');

  const handleSignup = async () => {
    try {
      setError('');
      await signup({ fullName, email, password, phone });
      router.replace('/home');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full Name" />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.btn} onPress={handleSignup}><Text style={styles.btnText}>Signup</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 18, color: COLORS.text },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  error: { color: COLORS.danger, marginBottom: 8 },
});
