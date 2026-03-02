import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../src/services/api';
import { COLORS } from '../src/config/appConfig';
import { AppTextInput as TextInput } from '../src/components/AppTextInput';
import { LoadingButton } from '../src/components/LoadingButton';

export default function DeliveryRegistrationScreen() {
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = await api.applyDelivery({ vehicleType, vehicleNumber });
      setStatus(`Application submitted. Status: ${data.status}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Become a Delivery Partner</Text>
      <TextInput style={styles.input} value={vehicleType} onChangeText={setVehicleType} placeholder="Vehicle Type" />
      <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="Vehicle Number" />
      <LoadingButton title="Submit" loadingTitle="Submitting" loading={submitting} onPress={submit} style={styles.btn} />
      {!!status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 14 , textAlign: 'center'},
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  btn: { marginTop: 2 },
  status: { marginTop: 12, color: COLORS.success, fontWeight: '700' },
});

