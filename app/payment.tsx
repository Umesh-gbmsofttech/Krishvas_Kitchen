import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, RAZORPAY_KEY, STRIPE_KEY } from '../src/config/appConfig';
import { useCart } from '../src/context/CartContext';
import { api } from '../src/services/api';

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ addressLine: string; apartmentOrSociety: string; flatNumber: string; latitude: string; longitude: string }>();
  const [method, setMethod] = useState<'COD' | 'UPI'>('COD');
  const [placing, setPlacing] = useState(false);
  const { items, clearCart } = useCart();
  const router = useRouter();

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const order = await api.placeOrder({
        addressLine: params.addressLine,
        apartmentOrSociety: params.apartmentOrSociety,
        flatNumber: params.flatNumber,
        latitude: Number(params.latitude),
        longitude: Number(params.longitude),
        paymentMethod: method,
        notes: `Razorpay key: ${RAZORPAY_KEY}, Stripe key: ${STRIPE_KEY}`,
        items: items.map((i) => ({ ...i, unitPrice: i.unitPrice })),
      });
      if (method === 'UPI') {
        await api.payOrder(order.orderId, { method: 'UPI', provider: 'UPI', transactionRef: `UPI-${Date.now()}` });
      }
      clearCart();
      router.replace({ pathname: '/order-tracking', params: { orderId: order.orderId } });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Select Payment</Text>
      <Pressable onPress={() => setMethod('COD')} style={[styles.option, method === 'COD' && styles.active]}><Text>Cash on Delivery</Text></Pressable>
      <Pressable onPress={() => setMethod('UPI')} style={[styles.option, method === 'UPI' && styles.active]}><Text>UPI</Text></Pressable>
      <Text style={styles.hint}>Razorpay/Stripe ready with placeholder keys.</Text>
      <Pressable style={styles.btn} onPress={placeOrder} disabled={placing}><Text style={styles.btnText}>{placing ? 'Placing...' : 'Place Order'}</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 14 },
  option: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  active: { borderWidth: 2, borderColor: COLORS.accent },
  hint: { color: COLORS.muted, marginTop: 6 },
  btn: { marginTop: 14, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
  btnText: { color: '#fff', fontWeight: '800' },
});
