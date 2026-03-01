import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/home');
      return;
    }
    if (user.role === 'ADMIN') {
      router.replace('/admin/dashboard');
      return;
    }
    if (user.role === 'DELIVERY_PARTNER') {
      router.replace('/delivery/dashboard');
      return;
    }
    router.replace('/home');
  }, [ready, user, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
