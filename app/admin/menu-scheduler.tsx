import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { resolveImageUrl } from '../../src/utils/images';
import { AnimatedHeading } from '../../src/components/AnimatedHeading';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';

type DraftItem = {
  name: string;
  description: string;
  price: string;
  category: 'SPECIALS' | 'DESSERTS' | 'BEVERAGES' | 'STARTERS' | 'MAINS';
  available: boolean;
  imageUri: string;
  existingImageUrl?: string;
};

type ScheduledMenuVM = {
  id: number;
  title: string;
  description?: string;
  scheduleDate: string;
  items: any[];
  raw: any;
};

const PAGE_SIZE = 6;

const createBlankItem = (): DraftItem => ({
  name: '',
  description: '',
  price: '',
  category: 'SPECIALS',
  available: true,
  imageUri: '',
});

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeMenus = (list: any[]): ScheduledMenuVM[] =>
  (list || [])
    .map((m: any) => {
      const title = String(m?.title ?? m?.menuTitle ?? m?.menu?.title ?? m?.name ?? '').trim();
      const scheduleDate = String(m?.scheduleDate ?? m?.schedule_date ?? m?.menu?.scheduleDate ?? '').trim();
      return {
        id: Number(m?.id ?? m?.menuId ?? 0),
        title: title || `Menu #${m?.id ?? m?.menuId ?? ''}`,
        description: m?.description ?? m?.menu?.description ?? '',
        scheduleDate: scheduleDate || 'No date',
        items: Array.isArray(m?.items) ? m.items : Array.isArray(m?.menu?.items) ? m.menu.items : [],
        raw: m,
      };
    })
    .filter((m) => m.id > 0);

export default function MenuSchedulerScreen() {
  const getToday = () => formatLocalDate(new Date(Date.now()));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleDate, setScheduleDate] = useState(getToday());
  const [scheduled, setScheduled] = useState<ScheduledMenuVM[]>([]);
  const [pastMenus, setPastMenus] = useState<ScheduledMenuVM[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([createBlankItem()]);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [expandedScheduledId, setExpandedScheduledId] = useState<number | null>(null);
  const [expandedPastId, setExpandedPastId] = useState<number | null>(null);
  const [scheduledPage, setScheduledPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const pagingLockRef = useRef(false);

  const load = useCallback(async () => {
    const today = getToday();
    const endDate = new Date(Date.now());
    endDate.setDate(endDate.getDate() + 30);
    const end = formatLocalDate(endDate);
    const yesterdayDate = new Date(Date.now());
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = formatLocalDate(yesterdayDate);
    const pastStartDate = new Date(Date.now());
    pastStartDate.setDate(pastStartDate.getDate() - 90);
    const pastStart = formatLocalDate(pastStartDate);

    const [s, p, sug] = await Promise.all([
      api.scheduledMenus(today, end),
      api.scheduledMenus(pastStart, yesterday),
      api.menuSuggestions(),
    ]);
    setScheduled(normalizeMenus(s));
    setPastMenus(normalizeMenus(p).reverse());
    setSuggestions(sug);
    setScheduledPage(1);
    setPastPage(1);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const pickImage = async (index: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, imageUri: asset.uri, existingImageUrl: undefined } : item)));
  };


  const resetForm = () => {
    const today = getToday();
    setEditingMenuId(null);
    setTitle('');
    setDescription('');
    setScheduleDate(today);
    setItems([createBlankItem()]);
    setError('');
    setShowMenuForm(false);
  };

  const editScheduledMenu = (menu: any) => {
    const today = getToday();
    setEditingMenuId(menu.id);
    setTitle(menu.title || menu.name || '');
    setDescription(menu.description || '');
    setScheduleDate(menu.scheduleDate || menu.schedule_date || today);
    const mappedItems: DraftItem[] = (menu.items || []).map((it: any) => ({
      name: it.name || '',
      description: it.description || '',
      price: String(it.price ?? ''),
      category: (it.category || 'SPECIALS') as DraftItem['category'],
      available: !!it.available,
      imageUri: '',
      existingImageUrl: it.imageUrl || '',
    }));
    setItems(mappedItems.length ? mappedItems : [createBlankItem()]);
    setError('');
    setShowMenuForm(true);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const payloadItems = await Promise.all(
        items.map(async (item) => {
          let imageUrl = item.existingImageUrl || 'mutton.jpg';
          if (item.imageUri) {
            const uploaded = await api.uploadImage({ uri: item.imageUri, name: `${item.name.replace(/\s+/g, '-').toLowerCase()}.jpg`, type: 'image/jpeg' }, 'MENU_ITEM', 0);
            imageUrl = uploaded.imageUrl;
          }

          return {
            name: item.name,
            description: item.description,
            price: Number(item.price || 0),
            category: item.category,
            imageUrl,
            available: item.available,
          };
        })
      );

      const payload = {
        title,
        description,
        scheduleDate,
        template: true,
        items: payloadItems,
      };
      if (editingMenuId) {
        await api.updateMenu(editingMenuId, payload);
      } else {
        await api.createMenu(payload);
      }
      await load();
      resetForm();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Unable to save menu');
    } finally {
      setSaving(false);
    }
  };

  const visibleScheduled = scheduled.slice(0, scheduledPage * PAGE_SIZE);
  const visiblePastMenus = pastMenus.slice(0, pastPage * PAGE_SIZE);
  const hasMoreScheduled = visibleScheduled.length < scheduled.length;
  const hasMorePast = visiblePastMenus.length < pastMenus.length;

  const onSchedulerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagingLockRef.current) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;
    if (!nearBottom) return;

    let changed = false;
    if (hasMoreScheduled) {
      setScheduledPage((prev) => prev + 1);
      changed = true;
    }
    if (hasMorePast) {
      setPastPage((prev) => prev + 1);
      changed = true;
    }
    if (changed) {
      pagingLockRef.current = true;
      setTimeout(() => {
        pagingLockRef.current = false;
      }, 220);
    }
  };


  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }} onScroll={onSchedulerScroll} scrollEventThrottle={16}>
      <AnimatedHeading text="Menu Scheduler (30 days)" />

      <TouchableOpacity activeOpacity={0.8} style={styles.sectionToggle} onPress={() => setShowMenuForm((v) => !v)}>
        <Text style={styles.sectionToggleTitle}>{editingMenuId ? 'Update Menu' : 'Add Menu'}</Text>
        <Text style={styles.sectionToggleSub}>{showMenuForm ? 'Tap to collapse form' : 'Tap to open add/create form'}</Text>
      </TouchableOpacity>

      {showMenuForm ? (
        <View style={styles.formWrap}>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Menu title" />
          <TextInput value={description} onChangeText={setDescription} style={styles.input} placeholder="Description" />
          <TextInput value={scheduleDate} onChangeText={setScheduleDate} style={styles.input} placeholder="YYYY-MM-DD" />

          <AnimatedHeading text="Items" />
          {items.map((item, idx) => {
            const resolvedExisting = resolveImageUrl(item.existingImageUrl);
            const preview = item.imageUri ? { uri: item.imageUri } : resolvedExisting ? { uri: resolvedExisting } : require('../../assets/images/mutton.jpg');
            return (
              <View key={idx} style={styles.itemForm}>
                <Text style={styles.itemLabel}>Item {idx + 1}</Text>
                <Image source={preview} style={styles.preview} />
                <Pressable style={styles.pickBtn} onPress={() => pickImage(idx)}>
                  <Text style={styles.pickBtnText}>Select Image</Text>
                </Pressable>
                <TextInput value={item.name} onChangeText={(v) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, name: v } : x)))} style={styles.input} placeholder="Item name" />
                <TextInput value={item.description} onChangeText={(v) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, description: v } : x)))} style={styles.input} placeholder="Item description" />
                <TextInput value={item.price} onChangeText={(v) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, price: v } : x)))} style={styles.input} placeholder="Price" keyboardType="numeric" />
                {items.length > 1 ? (
                  <Pressable style={styles.removeBtn} onPress={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <Text style={styles.removeBtnText}>Remove Item</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          <Pressable style={styles.addItemBtn} onPress={() => setItems((prev) => [...prev, createBlankItem()])}>
            <Text style={styles.addItemBtnText}>Add Item</Text>
          </Pressable>
          {!!error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.btn} onPress={save} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : editingMenuId ? 'Update Menu' : 'Save Menu'}</Text>
          </Pressable>
          {editingMenuId ? (
            <Pressable style={styles.cancelEditBtn} onPress={resetForm} disabled={saving}>
              <Text style={styles.cancelEditText}>Cancel Edit</Text>
            </Pressable>
          ) : null}

          <AnimatedHeading text="Suggestions" />
          {suggestions.slice(0, 5).map((m) => (
            <View key={m.id} style={styles.card}>
              <Text style={styles.bold}>{m.title}</Text>
              <Text>{m.scheduleDate}</Text>
              {(m.items || []).map((it: any) => (
                <View key={it.id} style={styles.itemCard}>
                  <Image source={resolveImageUrl(it.imageUrl) ? { uri: resolveImageUrl(it.imageUrl)! } : require('../../assets/images/mutton.jpg')} style={styles.smallImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bold}>{it.name}</Text>
                    <Text numberOfLines={1}>{it.description}</Text>
                    <Text>Rs {it.price}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <AnimatedHeading text="Scheduled Menus" />
      {visibleScheduled.map((m) => (
        <View key={m.id} style={styles.card}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setExpandedScheduledId((prev) => (prev === m.id ? null : m.id))}>
            <Text style={styles.bold}>{m.title}</Text>
            <Text>{m.scheduleDate}</Text>
          </TouchableOpacity>
          {expandedScheduledId === m.id ? (
            <>
              <Pressable style={styles.editBtn} onPress={() => editScheduledMenu(m.raw)}>
                <Text style={styles.editBtnText}>Edit Scheduled Menu</Text>
              </Pressable>
              {m.items.map((it: any) => (
                <View key={it.id} style={styles.itemCard}>
                  <Image source={resolveImageUrl(it.imageUrl) ? { uri: resolveImageUrl(it.imageUrl)! } : require('../../assets/images/mutton.jpg')} style={styles.smallImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bold}>{it.name}</Text>
                    <Text numberOfLines={1}>{it.description}</Text>
                    <Text>Rs {it.price}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ))}
      {hasMoreScheduled ? <Text style={styles.paginationText}>Scroll to load more scheduled menus...</Text> : null}

      <AnimatedHeading text="Past Menus" />
      {visiblePastMenus.map((m) => (
        <View key={`past-${m.id}`} style={styles.card}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setExpandedPastId((prev) => (prev === m.id ? null : m.id))}>
            <Text style={styles.bold}>{m.title}</Text>
            <Text>{m.scheduleDate}</Text>
          </TouchableOpacity>
          {expandedPastId === m.id ? (
            <>
              {m.items.map((it: any) => (
                <View key={it.id} style={styles.itemCard}>
                  <Image source={resolveImageUrl(it.imageUrl) ? { uri: resolveImageUrl(it.imageUrl)! } : require('../../assets/images/mutton.jpg')} style={styles.smallImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bold}>{it.name}</Text>
                    <Text numberOfLines={1}>{it.description}</Text>
                    <Text>Rs {it.price}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ))}
      {hasMorePast ? <Text style={styles.paginationText}>Scroll to load more past menus...</Text> : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: '900' , textAlign: 'center'},
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  error: { color: COLORS.danger, marginTop: 8 },
  section: { marginTop: 14, fontSize: 18, fontWeight: '800' },
  sectionToggle: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 8 },
  sectionToggleTitle: { fontWeight: '900', color: COLORS.text },
  sectionToggleSub: { marginTop: 2, color: COLORS.muted, fontSize: 12 },
  formWrap: { marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  itemLabel: { fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  itemForm: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  pickBtn: { backgroundColor: '#111', borderRadius: 10, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  pickBtnText: { color: '#fff', fontWeight: '700' },
  preview: { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  removeBtn: { marginTop: 8, backgroundColor: COLORS.danger, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  removeBtnText: { color: '#fff', fontWeight: '700' },
  addItemBtn: { backgroundColor: '#111', borderRadius: 12, alignItems: 'center', paddingVertical: 11, marginTop: 10 },
  addItemBtnText: { color: '#fff', fontWeight: '800' },
  cancelEditBtn: { backgroundColor: '#f2f2f2', borderRadius: 12, alignItems: 'center', paddingVertical: 11, marginTop: 8 },
  cancelEditText: { color: COLORS.text, fontWeight: '700' },
  editBtn: { marginTop: 8, backgroundColor: COLORS.accentSoft, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { color: COLORS.accent, fontWeight: '800' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#f6f6f6', borderRadius: 10, padding: 6 },
  smallImage: { width: 56, height: 56, borderRadius: 8 },
  paginationText: { marginTop: 8, color: COLORS.muted, fontSize: 12, textAlign: 'center' },
});

