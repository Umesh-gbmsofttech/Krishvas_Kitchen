import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { useCart } from '../src/context/CartContext';
import { useNotifications } from '../src/context/NotificationContext';

export default function HomeScreen() {
  const [menu, setMenu] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const { addItem } = useCart();
  const { unread } = useNotifications();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const [daily, hero] = await Promise.all([api.dailyMenu(), api.banners()]);
      setMenu(daily);
      setBanners(hero);
    };
    load().catch(() => {});
  }, []);

  const filters = useMemo<string[]>(
    () => ['ALL', ...Array.from(new Set<string>((menu?.items || []).map((i: any) => String(i.category))))],
    [menu]
  );
  const items = useMemo(() => {
    const q = query.toLowerCase();
    return (menu?.items || []).filter((i: any) => {
      const filterOk = activeFilter === 'ALL' || i.category === activeFilter;
      const searchOk = i.name.toLowerCase().includes(q);
      return filterOk && searchOk;
    });
  }, [menu, query, activeFilter]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search" style={styles.search} />
        <Pressable style={styles.notif} onPress={() => router.push('/notifications')}>
          <Text style={{ fontSize: 18 }}>??</Text>
          {unread > 0 ? <View style={styles.badge}><Text style={styles.badgeTxt}>{unread}</Text></View> : null}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {(banners.length ? banners : [{ id: 1, title: 'Chef Specials', imageUrl: 'mutton.jpg' }]).map((b: any) => (
          <View key={b.id} style={styles.bannerCard}>
            <Image source={require('../assets/images/mutton.jpg')} style={styles.bannerImg} />
            <Text style={styles.bannerTitle}>{b.title}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {filters.map((filter) => (
          <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.chip, activeFilter === filter && styles.chipActive]}>
            <Text style={[styles.chipText, activeFilter === filter && styles.chipTextActive]}>{filter}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.heading}>{menu?.title || 'Daily Menu'}</Text>
      {items.map((item: any) => (
        <Pressable key={item.id} style={styles.itemCard} onPress={() => router.push({ pathname: '/item-details', params: { item: JSON.stringify(item) } })}>
          <Image source={require('../assets/images/mutton.jpg')} style={styles.itemImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.itemPrice}>Rs {item.price}</Text>
          </View>
          <Pressable
            onPress={() => addItem({ menuItemId: item.id, itemName: item.name, quantity: 1, unitPrice: Number(item.price), category: item.category })}
            style={styles.addBtn}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
          </Pressable>
        </Pressable>
      ))}

      <Pressable style={styles.fab} onPress={() => router.push('/cart')}><Text style={{ color: '#fff', fontWeight: '800' }}>Cart</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', marginBottom: 12 },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  notif: { width: 50, marginLeft: 8, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, backgroundColor: COLORS.accent, borderRadius: 8, minWidth: 16, paddingHorizontal: 4, alignItems: 'center' },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bannerCard: { width: 280, marginRight: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fff' },
  bannerImg: { width: '100%', height: 150 },
  bannerTitle: { fontSize: 18, fontWeight: '800', padding: 10 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.accent },
  heading: { fontSize: 24, fontWeight: '900', marginVertical: 10, color: COLORS.text },
  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 88, height: 88, borderRadius: 12, marginRight: 10 },
  itemName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  itemDesc: { color: COLORS.muted, fontSize: 12, marginVertical: 3 },
  itemPrice: { fontWeight: '800', color: COLORS.accent },
  addBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  fab: { marginTop: 8, backgroundColor: COLORS.text, alignItems: 'center', borderRadius: 12, paddingVertical: 14 },
});
