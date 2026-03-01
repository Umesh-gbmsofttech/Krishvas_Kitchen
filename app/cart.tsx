import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../src/context/CartContext';
import { COLORS } from '../src/config/appConfig';
import { formatCurrency } from '../src/utils/format';
import { resolveImageUrl } from '../src/utils/images';

export default function CartScreen() {
  const { items, updateQty, removeItem, total } = useCart();
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Cart</Text>
      {items.map((item) => (
        <View style={styles.card} key={item.itemName}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/mutton.jpg')}
            style={styles.image}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.itemName}</Text>
            <Text style={styles.price}>{formatCurrency(item.unitPrice)}</Text>
          </View>
          <View style={styles.qtyRow}>
            <Pressable onPress={() => updateQty(item.itemName, item.quantity - 1)} style={styles.qtyBtn}><Text>-</Text></Pressable>
            <Text>{item.quantity}</Text>
            <Pressable onPress={() => updateQty(item.itemName, item.quantity + 1)} style={styles.qtyBtn}><Text>+</Text></Pressable>
            <Pressable onPress={() => removeItem(item.itemName)} style={styles.delete}><Text style={{ color: '#fff' }}>X</Text></Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.total}>Total: {formatCurrency(total)}</Text>
      <Pressable style={styles.btn} onPress={() => router.push('/checkout')}><Text style={styles.btnText}>Checkout</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 12 , textAlign: 'center'},
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  image: { width: 56, height: 56, borderRadius: 10, marginRight: 10 },
  name: { fontWeight: '800' },
  price: { color: COLORS.accent, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: COLORS.chip, width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  delete: { backgroundColor: COLORS.danger, borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  total: { marginVertical: 16, fontSize: 20, fontWeight: '800' },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});

