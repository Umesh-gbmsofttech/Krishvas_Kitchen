import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { resolveImageUrl } from '../../src/utils/images';

type DraftItem = {
  name: string;
  description: string;
  price: string;
  category: 'SPECIALS' | 'DESSERTS' | 'BEVERAGES' | 'STARTERS' | 'MAINS';
  available: boolean;
  imageUri: string;
  existingImageUrl?: string;
};

const createBlankItem = (): DraftItem => ({
  name: '',
  description: '',
  price: '',
  category: 'SPECIALS',
  available: true,
  imageUri: '',
});

export default function MenuSchedulerScreen() {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('Royal Thali');
  const [description, setDescription] = useState('Rich and balanced lunch menu');
  const [scheduleDate, setScheduleDate] = useState(today);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([createBlankItem()]);

  const load = useCallback(async () => {
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [s, sug] = await Promise.all([api.scheduledMenus(today, end), api.menuSuggestions()]);
    setScheduled(s);
    setSuggestions(sug);
  }, [today]);

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
    setEditingMenuId(null);
    setTitle('Royal Thali');
    setDescription('Rich and balanced lunch menu');
    setScheduleDate(today);
    setItems([createBlankItem()]);
    setError('');
  };

  const editScheduledMenu = (menu: any) => {
    setEditingMenuId(menu.id);
    setTitle(menu.title || '');
    setDescription(menu.description || '');
    setScheduleDate(menu.scheduleDate || today);
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


  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Menu Scheduler (30 days)</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Menu title" />
      <TextInput value={description} onChangeText={setDescription} style={styles.input} placeholder="Description" />
      <TextInput value={scheduleDate} onChangeText={setScheduleDate} style={styles.input} placeholder="YYYY-MM-DD" />

      <Text style={styles.section}>Items</Text>
      {items.map((item, idx) => {
        const resolvedExisting = resolveImageUrl(item.existingImageUrl);
        const preview = item.imageUri ? { uri: item.imageUri } : resolvedExisting ? { uri: resolvedExisting } : require('../../assets/images/mutton.jpg');
        return (
          <View key={idx} style={styles.itemForm}>
            <Text style={styles.itemLabel}>Item {idx + 1}</Text>
            <TextInput value={item.name} onChangeText={(v) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, name: v } : x)))} style={styles.input} placeholder="Item name" />
            <TextInput value={item.description} onChangeText={(v) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, description: v } : x)))} style={styles.input} placeholder="Item description" />
            <TextInput value={item.price} onChangeText={(v) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, price: v } : x)))} style={styles.input} placeholder="Price" keyboardType="numeric" />
            <Pressable style={styles.pickBtn} onPress={() => pickImage(idx)}>
              <Text style={styles.pickBtnText}>Select Image</Text>
            </Pressable>
            <Image source={preview} style={styles.preview} />
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

      <Text style={styles.section}>Suggestions</Text>
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

      <Text style={styles.section}>Scheduled Menus</Text>
      {scheduled.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.bold}>{m.title}</Text>
          <Text>{m.scheduleDate}</Text>
          <Pressable style={styles.editBtn} onPress={() => editScheduledMenu(m)}>
            <Text style={styles.editBtnText}>Edit Scheduled Menu</Text>
          </Pressable>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: '900' },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  error: { color: COLORS.danger, marginTop: 8 },
  section: { marginTop: 14, fontSize: 18, fontWeight: '800' },
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
});
