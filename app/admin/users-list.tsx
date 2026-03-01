import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function UsersListScreen() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.adminUsers().then(setUsers).catch(() => {});
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Users List</Text>
      {users.map((u) => (
        <View style={styles.card} key={u.id}>
          <Text style={styles.bold}>{u.fullName}</Text>
          <Text>{u.email}</Text>
          <Text>{u.role}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
});
