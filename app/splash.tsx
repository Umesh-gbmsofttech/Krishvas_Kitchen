import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';

export default function SplashScreenPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/'), 1800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ImageBackground source={require('../assets/images/mutton.jpg')} style={styles.bg}>
      <View style={styles.overlay}>
        <Text style={styles.brand}>{`Krishva's Kitchen`}</Text>
        <Text style={styles.tag}>Freshly crafted meals, delivered warm.</Text>
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 24 }} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  brand: { color: '#fff', fontSize: 38, fontWeight: '900' },
  tag: { color: '#F4F4F4', marginTop: 8, fontSize: 16 },
});
