import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { LoadingButton } from '../../src/components/LoadingButton';

const salaryTypes = [
  { label: 'Fixed Daily (Rs)', value: 'FIXED_DAILY' },
  { label: 'Fixed Monthly (Rs)', value: 'FIXED_MONTHLY' },
  { label: 'By Kilometers (Rs/km)', value: 'PER_KM' },
];

export default function DeliveryApprovalsScreen() {
  const [pending, setPending] = useState<any[]>([]);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [draftById, setDraftById] = useState<Record<number, any>>({});
  const [errorById, setErrorById] = useState<Record<number, string>>({});

  const load = async () => {
    const data = await api.pendingDeliveries();
    setPending(data || []);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const updateDraft = (id: number, patch: any) => {
    setErrorById((prev) => ({ ...prev, [id]: '' }));
    setDraftById((prev) => ({
      ...prev,
      [id]: {
        vehicleType: prev[id]?.vehicleType ?? '',
        vehicleNumber: prev[id]?.vehicleNumber ?? '',
        salaryType: prev[id]?.salaryType ?? 'FIXED_DAILY',
        salaryAmount: prev[id]?.salaryAmount ?? '',
        ...patch,
      },
    }));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Delivery Partner Approvals</Text>
      {pending.map((p) => {
        const draft = draftById[p.id] || {
          vehicleType: p.vehicleType || '',
          vehicleNumber: p.vehicleNumber || '',
          salaryType: p.salaryType || 'FIXED_DAILY',
          salaryAmount: p.salaryAmount ? String(p.salaryAmount) : '',
        };
        const isSubmitting = submittingId === p.id;
        return (
          <View key={p.id} style={styles.card}>
            <Text style={styles.bold}>{p.user.fullName}</Text>
            <Text>{p.user.email}</Text>
            <TextInput
              style={styles.input}
              value={draft.vehicleType}
              onChangeText={(v) => updateDraft(p.id, { vehicleType: v })}
              placeholder="Vehicle Type"
            />
            <TextInput
              style={styles.input}
              value={draft.vehicleNumber}
              onChangeText={(v) => updateDraft(p.id, { vehicleNumber: v })}
              placeholder="Vehicle Number"
            />
            <View style={styles.row}>
              {salaryTypes.map((type) => (
                <Pressable
                  key={type.value}
                  style={[styles.chip, draft.salaryType === type.value && styles.chipActive]}
                  onPress={() => updateDraft(p.id, { salaryType: type.value })}
                >
                  <Text style={[styles.chipText, draft.salaryType === type.value && styles.chipTextActive]}>{type.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={draft.salaryAmount}
              onChangeText={(v) => updateDraft(p.id, { salaryAmount: v })}
              keyboardType="numeric"
              placeholder="Salary amount in Rs"
            />
            {!!errorById[p.id] ? <Text style={styles.errorText}>{errorById[p.id]}</Text> : null}

            <View style={styles.buttonRow}>
              <LoadingButton
                title="Save Edit"
                loadingTitle="Submitting"
                loading={isSubmitting}
                style={styles.smallBtn}
                onPress={async () => {
                  if (isSubmitting) return;
                  setSubmittingId(p.id);
                  try {
                    await api.updateDeliveryPartner(p.id, {
                      vehicleType: draft.vehicleType,
                      vehicleNumber: draft.vehicleNumber,
                      salaryType: draft.salaryType,
                      salaryAmount: Number(draft.salaryAmount || 0),
                    });
                    await load();
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              />
              <LoadingButton
                title="Approve"
                loadingTitle="Submitting"
                loading={isSubmitting}
                style={styles.smallBtn}
                onPress={async () => {
                  if (isSubmitting) return;
                  const salaryAmount = Number(draft.salaryAmount);
                  if (!draft.salaryType || !Number.isFinite(salaryAmount) || salaryAmount <= 0) {
                    setErrorById((prev) => ({ ...prev, [p.id]: 'Select salary type and enter valid salary amount (> 0).' }));
                    return;
                  }
                  setSubmittingId(p.id);
                  try {
                    await api.decideDelivery(p.id, {
                      approve: true,
                      vehicleType: draft.vehicleType,
                      vehicleNumber: draft.vehicleNumber,
                      salaryType: draft.salaryType,
                      salaryAmount,
                    });
                    await load();
                    setErrorById((prev) => ({ ...prev, [p.id]: '' }));
                  } catch (e: any) {
                    setErrorById((prev) => ({
                      ...prev,
                      [p.id]: e?.response?.data?.message || 'Unable to approve. Check salary details and try again.',
                    }));
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              />
              <LoadingButton
                title="Reject"
                loadingTitle="Submitting"
                loading={isSubmitting}
                style={styles.smallBtn}
                onPress={async () => {
                  if (isSubmitting) return;
                  setSubmittingId(p.id);
                  try {
                    await api.decideDelivery(p.id, {
                      approve: false,
                      vehicleType: draft.vehicleType,
                      vehicleNumber: draft.vehicleNumber,
                      salaryType: draft.salaryType,
                      salaryAmount: Number(draft.salaryAmount || 0),
                    });
                    await load();
                    setErrorById((prev) => ({ ...prev, [p.id]: '' }));
                  } catch (e: any) {
                    setErrorById((prev) => ({ ...prev, [p.id]: e?.response?.data?.message || 'Unable to reject request.' }));
                  } finally {
                    setSubmittingId(null);
                  }
                }}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  bold: { fontWeight: '800' },
  input: { backgroundColor: '#f8f8f8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: COLORS.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: COLORS.accentSoft },
  chipText: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: COLORS.accent },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn: { flex: 1 },
  errorText: { color: COLORS.danger, marginTop: 6, fontWeight: '600' },
});
