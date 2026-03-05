import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, CURRENCY_CODE, CURRENCY_SYMBOL } from '../src/config/appConfig';
import { useCart } from '../src/context/CartContext';
import { api } from '../src/services/api';
import { LoadingButton } from '../src/components/LoadingButton';
import { formatCurrency } from '../src/utils/format';

let stripeModule: { initPaymentSheet?: any; presentPaymentSheet?: any } | null = null;
try {
  // Avoid crashing in Expo Go where Stripe native module isn't present.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  stripeModule = require('@stripe/stripe-react-native');
} catch {
  stripeModule = null;
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    addressLine: string;
    apartmentOrSociety: string;
    flatNumber: string;
    latitude: string;
    longitude: string;
  }>();
  const router = useRouter();
  const initPaymentSheet = stripeModule?.initPaymentSheet;
  const presentPaymentSheet = stripeModule?.presentPaymentSheet;
  const { items, clearCart, bookingDate, bookingSlot } = useCart();
  const [selectedMethod, setSelectedMethod] = useState<'APPLE_PAY' | 'CARD' | 'BANK_TRANSFER'>('CARD');
  const [placing, setPlacing] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.unitPrice || 0) * Number(i.quantity || 0), 0),
    [items]
  );
  const amountMinor = useMemo(() => Math.max(0, Math.round(total * 100)), [total]);

  const parseCoord = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const resolveLiveCoords = async () => {
    const fallbackLat = parseCoord(params.latitude, 19.076);
    const fallbackLng = parseCoord(params.longitude, 72.8777);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { latitude: fallbackLat, longitude: fallbackLng };
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return { latitude: fallbackLat, longitude: fallbackLng };
    }
  };

  const placeOrder = async () => {
    if (placing) return;
    if (!items.length || amountMinor <= 0) {
      Alert.alert('Cart empty', 'Please add at least one item.');
      return;
    }
    setPlacing(true);
    try {
      if (!initPaymentSheet || !presentPaymentSheet) {
        throw new Error('Stripe payment requires dev build/APK. Expo Go does not support this native module.');
      }
      const intent = await api.stripeCreateIntent({
        amountMinor,
        currency: CURRENCY_CODE.toLowerCase(),
        orderRef: `KK-${Date.now()}`,
        paymentMethodPreference: selectedMethod,
      });
      const init = await initPaymentSheet({
        paymentIntentClientSecret: intent.clientSecret,
        merchantDisplayName: "Krishva's Kitchen",
        allowsDelayedPaymentMethods: true,
        applePay: { merchantCountryCode: 'GB' },
      });
      if (init.error) {
        throw new Error(init.error.message || 'Unable to initialize payment sheet');
      }

      const payResult = await presentPaymentSheet();
      if (payResult.error) {
        throw new Error(payResult.error.message || 'Payment was cancelled');
      }

      const liveCoords = await resolveLiveCoords();
      const order = await api.placeOrder({
        addressLine: params.addressLine,
        apartmentOrSociety: params.apartmentOrSociety,
        flatNumber: params.flatNumber,
        latitude: liveCoords.latitude,
        longitude: liveCoords.longitude,
        orderDate: bookingDate,
        orderSlot: bookingSlot,
        paymentMethod: 'STRIPE',
        stripePaymentIntentId: intent.paymentIntentId,
        notes: `Stripe method ${selectedMethod}`,
        items: items.map((i) => ({ ...i, unitPrice: i.unitPrice })),
      });

      clearCart();
      router.replace({ pathname: '/order-tracking', params: { orderId: order.orderId } });
    } catch (e: any) {
      Alert.alert('Payment failed', e?.message || 'Unable to complete payment');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Select Payment</Text>
      <Text style={styles.amount}>
        Total: {CURRENCY_SYMBOL}
        {formatCurrency(total).replace(/[^0-9.,-]/g, '')}
      </Text>
      <Pressable onPress={() => setSelectedMethod('APPLE_PAY')} style={[styles.option, selectedMethod === 'APPLE_PAY' && styles.active]}>
        <Text>Apple Pay</Text>
      </Pressable>
      <Pressable onPress={() => setSelectedMethod('CARD')} style={[styles.option, selectedMethod === 'CARD' && styles.active]}>
        <Text>Credit / Debit Card</Text>
      </Pressable>
      <Pressable onPress={() => setSelectedMethod('BANK_TRANSFER')} style={[styles.option, selectedMethod === 'BANK_TRANSFER' && styles.active]}>
        <Text>Bank Transfer</Text>
      </Pressable>
      <Text style={styles.hint}>You will complete payment first, then order will be created.</Text>
      <LoadingButton title="Pay & Place Order" loadingTitle="Submitting" loading={placing} onPress={placeOrder} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 14, textAlign: 'center' },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.accent, marginBottom: 10, textAlign: 'center' },
  option: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  active: { borderWidth: 2, borderColor: COLORS.accent },
  hint: { color: COLORS.muted, marginTop: 6 },
  btn: { marginTop: 14 },
});
