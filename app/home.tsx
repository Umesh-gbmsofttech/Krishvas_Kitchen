import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { useCart } from '../src/context/CartContext';
import { resolveImageUrl } from '../src/utils/images';
import { useAuth } from '../src/context/AuthContext';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { hasMore, paginate } from '../src/utils/pagination';
import { BannerCarousel } from '../src/components/BannerCarousel';
import { AnimatedHeading } from '../src/components/AnimatedHeading';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { Skeleton } from '../src/components/Skeleton';

export default function HomeScreen() {
  const [menu, setMenu] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [justAddedById, setJustAddedById] = useState<Record<string, boolean>>({});
  const debouncedQuery = useDebouncedValue(query, 350);
  const { addItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const load = useCallback(async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dailyRes, bannersRes] = await Promise.allSettled([api.dailyMenu(), api.banners()]);
      if (dailyRes.status === 'fulfilled') {
        setMenu(dailyRes.value || null);
      } else {
        setMenu(null);
      }
      if (bannersRes.status === 'fulfilled') {
        setBanners(Array.isArray(bannersRes.value) ? bannersRes.value : []);
      } else {
        setBanners([]);
      }
    } finally {
      if (asRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false).catch(() => setLoading(false));
  }, [load]);

  const filters = useMemo<string[]>(
    () => ['ALL', ...Array.from(new Set<string>((menu?.items || []).map((i: any) => String(i.category))))],
    [menu]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeFilter]);

  const filteredItems = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return (menu?.items || []).filter((i: any) => {
      const filterOk = activeFilter === 'ALL' || i.category === activeFilter;
      const name = String(i?.name || '').toLowerCase();
      const searchOk = !q || name.includes(q);
      return filterOk && searchOk;
    });
  }, [menu, debouncedQuery, activeFilter]);

  const visibleItems = useMemo(() => paginate(filteredItems, page), [filteredItems, page]);
  const profileUri = resolveImageUrl(user?.profileImageUrl);
  const onAdd = (item: any) => {
    addItem({
      menuItemId: item.id,
      itemName: item.name,
      quantity: 1,
      unitPrice: Number(item.price),
      category: item.category,
      imageUrl: item.imageUrl,
    });
    const key = String(item.id);
    setJustAddedById((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setJustAddedById((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1800);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {loading ? (
        <View style={styles.carouselSkelWrap}>
          <Skeleton style={styles.carouselSkel} />
        </View>
      ) : (
        <BannerCarousel banners={banners} />
      )}
      <View style={styles.topRow}>
        <Pressable style={styles.avatarButton} onPress={() => router.push('/profile')}>
          <Image source={profileUri ? { uri: profileUri } : require('../assets/images/mutton.jpg')} style={styles.avatar} />
        </Pressable>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search" style={styles.searchBelow} />
        <Pressable style={styles.searchBtn} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={19} color={COLORS.text} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {filters.map((filter) => (
          <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.chip, activeFilter === filter && styles.chipActive]}>
            <Text style={[styles.chipText, activeFilter === filter && styles.chipTextActive]}>{filter}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <AnimatedHeading text={menu?.title || 'Daily Menu'} />
      {loading
        ? Array.from({ length: 4 }).map((_, idx) => (
            <View key={`home-skeleton-${idx}`} style={styles.itemCard}>
              <Skeleton style={styles.itemImage} />
              <View style={{ flex: 1 }}>
                <Skeleton style={styles.skelTitle} />
                <Skeleton style={styles.skelLine} />
                <Skeleton style={styles.skelPrice} />
              </View>
              <Skeleton style={styles.skelBtn} />
            </View>
          ))
        : null}
      {visibleItems.map((item: any) => (
        <Pressable key={item.id} style={styles.itemCard} onPress={() => router.push({ pathname: '/item-details', params: { item: JSON.stringify(item) } })}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/mutton.jpg')}
            style={styles.itemImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.itemPrice}>Rs {item.price}</Text>
          </View>
          <Pressable
            onPress={() => onAdd(item)}
            style={styles.addBtn}
          >
            {justAddedById[String(item.id)] ? (
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
            )}
          </Pressable>
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
  content: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  avatarButton: { marginRight: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' },
  searchBelow: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  searchBtn: {
    width: 50,
    marginLeft: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.accent },
  heading: { fontSize: 24, fontWeight: '900', marginVertical: 10, color: COLORS.text, textAlign: 'center' },
  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 88, height: 88, borderRadius: 12, marginRight: 10 },
  itemName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  itemDesc: { color: COLORS.muted, fontSize: 12, marginVertical: 3 },
  itemPrice: { fontWeight: '800', color: COLORS.accent },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  carouselSkelWrap: { marginBottom: 16, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff' },
  carouselSkel: { width: '100%', height: 220 },
  skelTitle: { height: 16, borderRadius: 8, width: '62%', marginTop: 2 },
  skelLine: { height: 12, borderRadius: 8, width: '90%', marginTop: 8 },
  skelPrice: { height: 12, borderRadius: 8, width: '40%', marginTop: 8 },
  skelBtn: { width: 52, height: 32, borderRadius: 10 },
  more: { backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  moreText: { color: COLORS.text, fontWeight: '700' },
});
