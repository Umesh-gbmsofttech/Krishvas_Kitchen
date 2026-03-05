import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLORS } from '../src/config/appConfig';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { KeyboardScreen } from '../src/components/KeyboardScreen';
import { useCart } from '../src/context/CartContext';
import { formatCurrency } from '../src/utils/format';

export default function CheckoutScreen() {
  const [addressLine, setAddressLine] = useState('');
  const [apartmentOrSociety, setApartmentOrSociety] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [fetchingLiveLocation, setFetchingLiveLocation] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState('');
  const { total, items, bookingDate, bookingSlot } = useCart();
  const router = useRouter();

  const resolveLiveCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationEnabled(false);
        setLocationError('Location permission is required to continue checkout');
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationEnabled(true);
      setLocationError('');
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      setLocationEnabled(false);
      setLocationError('Unable to fetch live location');
      return null;
    }
  };

  const goToPayment = async () => {
    if (fetchingLiveLocation) return;
    setFetchingLiveLocation(true);
    try {
      const coords = await resolveLiveCoords();
      if (!coords) return;
      if (!items.length || total <= 0) {
        setLocationError('Your cart is empty. Please add menu items first.');
        return;
      }
      router.push({
        pathname: '/payment',
        params: {
          addressLine,
          apartmentOrSociety,
          flatNumber,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
        },
      });
    } finally {
      setFetchingLiveLocation(false);
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationEnabled(false);
          setLocationError('Location permission is required to continue checkout');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        setAddressLine(`Lat ${loc.coords.latitude.toFixed(4)}, Lng ${loc.coords.longitude.toFixed(4)}`);
        setLocationEnabled(true);
        setLocationError('');
      } catch {
        setLocationEnabled(false);
        setLocationError('Unable to fetch live location');
      }
    };
    fetchLocation();
  }, []);

  return (
    <KeyboardScreen containerStyle={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout Address</Text>
      <TextInput style={styles.input} value={addressLine} onChangeText={setAddressLine} placeholder="Address line" editable={false} />
      <TextInput style={styles.input} value={apartmentOrSociety} onChangeText={setApartmentOrSociety} placeholder="Apartment / Society" />
      <TextInput style={styles.input} value={flatNumber} onChangeText={setFlatNumber} placeholder="Flat Number" />
      <Text style={styles.meta}>Booking Date: {bookingDate}</Text>
      <Text style={styles.meta}>Booking Slot: {bookingSlot}</Text>
      <Text style={styles.total}>Total: {formatCurrency(total)}</Text>
      {!!locationError ? <Text style={styles.error}>{locationError}</Text> : null}

      <Pressable
        style={styles.btn}
        onPress={goToPayment}
        disabled={fetchingLiveLocation || !locationEnabled || !items.length || total <= 0}
      >
        <Text style={styles.btnText}>{fetchingLiveLocation ? 'Fetching live location...' : 'Continue to Payment'}</Text>
      </Pressable>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 12 , textAlign: 'center'},
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  meta: { color: COLORS.muted, fontWeight: '600', marginBottom: 2 },
  total: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  error: { color: COLORS.danger, marginTop: 2, marginBottom: 8 },
  btn: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
  btnText: { color: '#fff', fontWeight: '800' },
});

