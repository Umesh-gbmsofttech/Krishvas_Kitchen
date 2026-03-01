import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../src/config/appConfig';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';

export default function CheckoutScreen() {
  const [addressLine, setAddressLine] = useState('');
  const [apartmentOrSociety, setApartmentOrSociety] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [latitude, setLatitude] = useState(19.076);
  const [longitude, setLongitude] = useState(72.8777);
  const [fetchingLiveLocation, setFetchingLiveLocation] = useState(false);
  const router = useRouter();

  const resolveLiveCoords = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { latitude, longitude };
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return { latitude, longitude };
    }
  };

  const goToPayment = async () => {
    if (fetchingLiveLocation) return;
    setFetchingLiveLocation(true);
    try {
      const coords = await resolveLiveCoords();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
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
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        setAddressLine(`Lat ${loc.coords.latitude.toFixed(4)}, Lng ${loc.coords.longitude.toFixed(4)}`);
      } catch {
        // fallback values
      }
    };
    fetchLocation();
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Checkout Address</Text>
      <TextInput style={styles.input} value={addressLine} onChangeText={setAddressLine} placeholder="Address line" />
      <TextInput style={styles.input} value={apartmentOrSociety} onChangeText={setApartmentOrSociety} placeholder="Apartment / Society" />
      <TextInput style={styles.input} value={flatNumber} onChangeText={setFlatNumber} placeholder="Flat Number" />

      <Pressable
        style={styles.btn}
        onPress={goToPayment}
        disabled={fetchingLiveLocation}
      >
        <Text style={styles.btnText}>{fetchingLiveLocation ? 'Fetching live location...' : 'Continue to Payment'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 12 , textAlign: 'center'},
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  btn: { marginTop: 8, backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
  btnText: { color: '#fff', fontWeight: '800' },
});

