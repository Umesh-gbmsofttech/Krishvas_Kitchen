import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../src/config/appConfig';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { api } from '../src/services/api';
import { hasMore, paginate } from '../src/utils/pagination';
import { resolveImageUrl } from '../src/utils/images';
import { LoadingText } from '../src/components/LoadingText';

export default function TodaysMenuScreen() {
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setMenu(await api.dailyMenu());
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filteredItems = useMemo(() => {
    const list = menu?.items || [];
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i: any) => String(i?.name || '').toLowerCase().includes(q) || String(i?.category || '').toLowerCase().includes(q));
  }, [menu, debouncedSearch]);

  const visibleItems = useMemo(() => paginate(filteredItems, page), [filteredItems, page]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{menu?.title || "Today's Menu"}</Text>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search menu items" style={styles.search} />
      {loading ? <LoadingText base="Loading" style={styles.loading} /> : null}
      {!loading && !filteredItems.length ? <Text style={styles.empty}>No menu items available.</Text> : null}
      {visibleItems.map((item: any) => (
        <Pressable key={item.id} style={styles.card} onPress={() => router.push({ pathname: '/item-details', params: { item: JSON.stringify(item) } })}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/mutton.jpg')}
            style={styles.image}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.category}</Text>
            <Text style={styles.price}>Rs {item.price}</Text>
          </View>
        </Pressable>
      ))}
      {!loading && hasMore(filteredItems, page) ? (
        <Pressable style={styles.more} onPress={() => setPage((p) => p + 1)}>
          <Text style={styles.moreText}>Load More</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 26 },
  title: { fontSize: 24, fontWeight: '900' },
  search: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  loading: { color: COLORS.muted, marginTop: 12, fontWeight: '700' },
  empty: { color: COLORS.muted, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  image: { width: 76, height: 76, borderRadius: 10, marginRight: 10 },
  name: { fontWeight: '800', fontSize: 15 },
  meta: { color: COLORS.muted, marginTop: 2 },
  price: { color: COLORS.accent, marginTop: 4, fontWeight: '700' },
  more: { marginTop: 12, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  moreText: { fontWeight: '700', color: COLORS.text },
});

