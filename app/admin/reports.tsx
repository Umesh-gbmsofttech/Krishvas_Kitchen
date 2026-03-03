import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { formatCurrency } from '../../src/utils/format';

const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReportsScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));

  useEffect(() => {
    api.allOrders().then(setOrders).catch(() => {});
  }, []);

  const dateOrders = useMemo(
    () =>
      orders.filter((order) => {
        const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
        return formatLocalDate(createdAt) === selectedDate;
      }),
    [orders, selectedDate]
  );

  const totalRevenue = dateOrders.reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);
  const onlinePaid = dateOrders
    .filter((order) => String(order?.paymentMethod || '') !== 'COD' && String(order?.paymentStatus || '') === 'SUCCESS')
    .reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);
  const codPaid = dateOrders
    .filter((order) => String(order?.paymentMethod || '') === 'COD' && ['DELIVERED', 'OUT_FOR_DELIVERY'].includes(String(order?.status || '')))
    .reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);

  const paidDeliveryOrders = dateOrders.filter((order) => Number(order?.totalAmount || 0) < 30);
  const freeDeliveryOrders = dateOrders.filter((order) => Number(order?.totalAmount || 0) >= 30);
  const deliveryCharges = paidDeliveryOrders.length * 2.5;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Reports</Text>
      <View style={styles.dateRow}>
        <Pressable style={styles.dateBtn} onPress={() => setSelectedDate(formatLocalDate(new Date(new Date(selectedDate).getTime() - 86400000)))}>
          <Text style={styles.dateBtnTxt}>Prev</Text>
        </Pressable>
        <Text style={styles.dateValue}>{selectedDate}</Text>
        <Pressable style={styles.dateBtn} onPress={() => setSelectedDate(formatLocalDate(new Date(new Date(selectedDate).getTime() + 86400000)))}>
          <Text style={styles.dateBtnTxt}>Next</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.value}>{formatCurrency(totalRevenue)}</Text>
        <Text>Total Earnings</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Breakdown</Text>
        <View style={styles.row}>
          <Text>Online Paid</Text>
          <Text style={styles.rowValue}>{formatCurrency(onlinePaid)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Cash on Delivery (COD Paid)</Text>
          <Text style={styles.rowValue}>{formatCurrency(codPaid)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Delivery Charges</Text>
        <View style={styles.row}>
          <Text>Paid Deliveries ({paidDeliveryOrders.length})</Text>
          <Text style={styles.rowValue}>{formatCurrency(deliveryCharges)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Free Deliveries ({freeDeliveryOrders.length})</Text>
          <Text style={styles.rowValue}>{formatCurrency(0)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Orders</Text>
        <View style={styles.row}>
          <Text>Total Orders</Text>
          <Text style={styles.rowValue}>{dateOrders.length}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900' , textAlign: 'center'},
  dateRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dateBtn: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  dateBtnTxt: { color: COLORS.text, fontWeight: '700' },
  dateValue: { flex: 1, textAlign: 'center', color: COLORS.text, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  cardTitle: { fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  rowValue: { color: COLORS.accent, fontWeight: '800' },
  value: { fontSize: 28, fontWeight: '900', color: COLORS.accent },
});

