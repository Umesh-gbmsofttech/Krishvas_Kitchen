import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function AdminLoginRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Admin Login</Text>
      <Text style={styles.text}>Use main login with admin credentials.</Text>
      <Pressable style={styles.btn} onPress={() => router.replace('/auth/login')}><Text style={styles.btnTxt}>Go to Login</Text></Pressable>
      {user?.role === 'ADMIN' ? <Pressable style={styles.btn} onPress={() => router.replace('/admin/dashboard')}><Text style={styles.btnTxt}>Open Dashboard</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 28, fontWeight: '900' },
  text: { marginTop: 8 },
  btn: { marginTop: 12, backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  btnTxt: { color: '#fff', fontWeight: '700' },
});
