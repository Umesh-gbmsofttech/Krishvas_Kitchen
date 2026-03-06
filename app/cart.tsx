import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCart } from '../src/context/CartContext';
import { COLORS } from '../src/config/appConfig';
import { formatCurrency } from '../src/utils/format';
import { resolveImageUrl } from '../src/utils/images';

export default function CartScreen() {
  const { items, updateQty, removeItem, total, bookingDate, bookingSlot } = useCart();
  const router = useRouter();

  const confirmRemoveItem = (itemName: string) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(itemName) },
    ]);
  };

  const onDecreaseQty = (itemName: string, quantity: number) => {
    if (quantity <= 1) {
      confirmRemoveItem(itemName);
      return;
    }
    updateQty(itemName, quantity - 1);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Cart</Text>
      {items.map((item) => (
        <View style={styles.card} key={item.itemName}>
          <Image
            source={resolveImageUrl(item.imageUrl) ? { uri: resolveImageUrl(item.imageUrl)! } : require('../assets/images/KrishvasKitchen_transparent.png')}
            style={styles.image}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.itemName}</Text>
            <Text style={styles.price}>{formatCurrency(item.unitPrice)}</Text>
          </View>
          <View style={styles.qtyRow}>
            <Pressable onPress={() => onDecreaseQty(item.itemName, item.quantity)} style={styles.qtyBtn}><Text>-</Text></Pressable>
            <Text>{item.quantity}</Text>
            <Pressable onPress={() => updateQty(item.itemName, item.quantity + 1)} style={styles.qtyBtn}><Text>+</Text></Pressable>
            <Pressable onPress={() => confirmRemoveItem(item.itemName)} style={styles.delete}><Text style={{ color: '#fff' }}>X</Text></Pressable>
          </View>
        </View>
      ))}

      <View style={styles.bookingCard}>
        <Text style={styles.bookingTitle}>Booking</Text>
        <Text style={styles.bookingMeta}>Date: {bookingDate}</Text>
        <Text style={styles.bookingMeta}>Slot: {bookingSlot}</Text>
      </View>
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
  bookingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  bookingTitle: { fontWeight: '800', color: COLORS.text },
  bookingMeta: { color: COLORS.muted, marginTop: 2 },
  total: { marginVertical: 16, fontSize: 20, fontWeight: '800' },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});

