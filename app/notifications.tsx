import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../src/context/NotificationContext';
import { COLORS } from '../src/config/appConfig';

export default function NotificationsScreen() {
  const { items, refresh } = useNotifications();

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Notifications</Text>
      {items.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.nTitle}>{n.title}</Text>
          <Text style={styles.message}>{n.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  nTitle: { fontWeight: '800' },
  message: { color: COLORS.muted, marginTop: 4 },
});
