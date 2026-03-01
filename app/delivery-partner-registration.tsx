import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';

export default function DeliveryRegistrationScreen() {
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('MH01AB1234');
  const [status, setStatus] = useState('');

  const submit = async () => {
    const data = await api.applyDelivery({ vehicleType, vehicleNumber });
    setStatus(`Application submitted. Status: ${data.status}`);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Become a Delivery Partner</Text>
      <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} placeholder="Vehicle Type" />
      <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="Vehicle Number" />
      <Pressable style={styles.btn} onPress={submit}><Text style={styles.btnText}>Submit</Text></Pressable>
      {!!status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 14 , textAlign: 'center'},
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
  status: { marginTop: 12, color: COLORS.success, fontWeight: '700' },
});

