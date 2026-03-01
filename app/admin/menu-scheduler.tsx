import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';

export default function MenuSchedulerScreen() {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('Royal Thali');
  const [description, setDescription] = useState('Rich and balanced lunch menu');
  const [scheduleDate, setScheduleDate] = useState(today);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const load = useCallback(async () => {
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const [s, sug] = await Promise.all([api.scheduledMenus(today, end), api.menuSuggestions()]);
    setScheduled(s);
    setSuggestions(sug);
  }, [today]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const save = async () => {
    await api.createMenu({
      title,
      description,
      scheduleDate,
      template: true,
      items: [
        { name: 'Mutton Curry', description: 'Slow cooked mutton', price: 320, category: 'SPECIALS', imageUrl: 'mutton.jpg', available: true },
        { name: 'Kheer', description: 'Traditional dessert', price: 90, category: 'DESSERTS', imageUrl: 'mutton.jpg', available: true },
      ],
    });
    load();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Menu Scheduler (30 days)</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Menu title" />
      <TextInput value={description} onChangeText={setDescription} style={styles.input} placeholder="Description" />
      <TextInput value={scheduleDate} onChangeText={setScheduleDate} style={styles.input} placeholder="YYYY-MM-DD" />
      <Pressable style={styles.btn} onPress={save}><Text style={styles.btnText}>Save Menu</Text></Pressable>

      <Text style={styles.section}>Suggestions</Text>
      {suggestions.slice(0, 5).map((m) => (
        <View key={m.id} style={styles.card}><Text style={styles.bold}>{m.title}</Text><Text>{m.scheduleDate}</Text></View>
      ))}

      <Text style={styles.section}>Scheduled Menus</Text>
      {scheduled.map((m) => (
        <View key={m.id} style={styles.card}><Text style={styles.bold}>{m.title}</Text><Text>{m.scheduleDate}</Text></View>
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
  section: { marginTop: 14, fontSize: 18, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
});
