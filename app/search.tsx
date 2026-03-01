import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { api } from '../src/services/api';
import { resolveImageUrl } from '../src/utils/images';
import { hasMore, paginate } from '../src/utils/pagination';
import { LoadingText } from '../src/components/LoadingText';

export default function SearchScreen() {
  const [sourceItems, setSourceItems] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 400);
  const router = useRouter();

  useEffect(() => {
    api.dailyMenu()
      .then((m) => setSourceItems(m?.items || []))
      .catch(() => setSourceItems([]));
  }, []);

  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    setPage(1);
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const next = sourceItems.filter((i) => String(i?.name || '').toLowerCase().includes(q) || String(i?.category || '').toLowerCase().includes(q));
      setResults(next);
      setLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [debouncedQuery, sourceItems]);

  const visible = useMemo(() => paginate(results, page), [results, page]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Search Menu</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Type item name..." style={styles.search} />

      {!debouncedQuery.trim() ? <Text style={styles.hint}>Enter text to start search.</Text> : null}
      {loading ? <LoadingText base="Loading" style={styles.hint} /> : null}
      {!!debouncedQuery.trim() && !loading && !results.length ? <Text style={styles.hint}>No items matched.</Text> : null}

      {visible.map((item: any) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/item-details', params: { item: JSON.stringify(item) } })}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/mutton.jpg')}
            style={styles.image}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.category}</Text>
          </View>
        </Pressable>
      ))}

      {!loading && hasMore(results, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  search: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  hint: { color: COLORS.muted, marginTop: 10, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  image: { width: 70, height: 70, borderRadius: 10, marginRight: 10 },
  name: { fontWeight: '800' },
  meta: { color: COLORS.muted, marginTop: 3 },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});


