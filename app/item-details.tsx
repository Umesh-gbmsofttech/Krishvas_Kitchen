import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../src/context/CartContext';
import { COLORS } from '../src/config/appConfig';

export default function ItemDetailsScreen() {
  const { item } = useLocalSearchParams<{ item: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const parsed = item ? JSON.parse(item) : null;

  if (!parsed) return <View style={styles.center}><Text>Item missing</Text></View>;

  return (
    <ScrollView style={styles.screen}>
      <Image source={require('../assets/images/mutton.jpg')} style={styles.hero} />
      <View style={styles.card}>
        <Text style={styles.title}>{parsed.name}</Text>
        <Text style={styles.desc}>{parsed.description}</Text>
        <Text style={styles.price}>Rs {parsed.price}</Text>

        <Text style={styles.section}>Ingredients</Text>
        <Text style={styles.pill}>Yogurt Juice</Text>
        <Text style={styles.pill}>Ginger-garlic paste</Text>

        <Pressable
          style={styles.btn}
          onPress={() => {
            addItem({ menuItemId: parsed.id, itemName: parsed.name, quantity: 1, unitPrice: Number(parsed.price), category: parsed.category });
            router.push('/cart');
          }}
        >
          <Text style={styles.btnText}>Add to cart</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: 280 },
  card: { backgroundColor: '#fff', marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  desc: { color: COLORS.muted, marginTop: 6 },
  price: { fontSize: 22, marginTop: 10, fontWeight: '800', color: COLORS.accent },
  section: { marginTop: 18, fontSize: 16, fontWeight: '700' },
  pill: { marginTop: 8, backgroundColor: COLORS.chip, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  btn: { marginTop: 24, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
  btnText: { color: '#fff', fontWeight: '800' },
});
