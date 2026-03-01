import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { LoadingText } from '../../src/components/LoadingText';
import { useDebouncedValue } from '../../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../../src/utils/pagination';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';

export default function UsersListScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    api.adminUsers().then((res) => setUsers(res || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => String(u?.fullName || '').toLowerCase().includes(q) || String(u?.email || '').toLowerCase().includes(q));
  }, [users, debouncedQuery]);
  const visible = useMemo(() => paginate(filtered, page), [filtered, page]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Users List</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search users" style={styles.search} />
      {loading ? <LoadingText base="Loading" style={styles.loading} /> : null}
      {visible.map((u) => (
        <View style={styles.card} key={u.id}>
          <Text style={styles.bold}>{u.fullName}</Text>
          <Text>{u.email}</Text>
          <Text>{u.role}</Text>
        </View>
      ))}
      {!loading && hasMore(filtered, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  search: { marginTop: 10, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  loading: { marginTop: 10, color: COLORS.muted, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

