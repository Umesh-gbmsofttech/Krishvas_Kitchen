import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/appConfig';

const toDateOnly = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const weekStartMonday = (baseDate: Date) => {
  const d = new Date(baseDate);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};

const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildWeekDays = (selectedDate: string) => {
  const start = weekStartMonday(toDateOnly(selectedDate));
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      dateValue: formatLocalDate(date),
      dayLabel: labels[i],
      dayNumber: date.getDate(),
    };
  });
};

type Props = {
  value: string;
  onChange: (nextDate: string) => void;
};

export function WeekDateStrip({ value, onChange }: Props) {
  const weekDays = useMemo(() => buildWeekDays(value), [value]);
  const currentMonthLabel = useMemo(() => {
    const d = toDateOnly(value);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [value]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.monthLabel}>{currentMonthLabel}</Text>
      <View style={styles.navRow}>
        <Pressable
          style={styles.navIconBtn}
          onPress={() => {
            const d = toDateOnly(value);
            d.setDate(d.getDate() - 7);
            onChange(formatLocalDate(d));
          }}
        >
          <Ionicons name="chevron-back" size={18} color={COLORS.muted} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {weekDays.map((day) => {
            const active = day.dateValue === value;
            return (
              <Pressable key={day.dateValue} style={[styles.dayCard, active && styles.dayCardActive]} onPress={() => onChange(day.dateValue)}>
                <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{day.dayLabel}</Text>
                <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{day.dayNumber}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          style={styles.navIconBtn}
          onPress={() => {
            const d = toDateOnly(value);
            d.setDate(d.getDate() + 7);
            onChange(formatLocalDate(d));
          }}
        >
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  monthLabel: { textAlign: 'center', color: COLORS.text, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  daysRow: { gap: 8, paddingHorizontal: 2 },
  dayCard: {
    width: 56,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayCardActive: { backgroundColor: COLORS.accent },
  dayLabel: { color: COLORS.muted, fontWeight: '800', fontSize: 10 },
  dayLabelActive: { color: '#fff' },
  dayNumber: { color: COLORS.text, fontWeight: '900', fontSize: 20, marginTop: 1 },
  dayNumberActive: { color: '#fff' },
});
