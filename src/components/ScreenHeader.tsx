import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../config/appConfig';

export const ScreenHeader = ({ title, rightText, onRightPress }: { title: string; rightText?: string; onRightPress?: () => void }) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {rightText ? (
      <Pressable onPress={onRightPress}>
        <Text style={styles.right}>{rightText}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  right: { color: COLORS.accent, fontWeight: '700' },
});
