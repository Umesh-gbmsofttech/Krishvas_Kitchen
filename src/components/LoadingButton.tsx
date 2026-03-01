import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { COLORS } from '../config/appConfig';
import { LoadingText } from './LoadingText';

type LoadingButtonProps = {
  title: string;
  loadingTitle?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
  style?: ViewStyle;
};

export const LoadingButton = ({ title, loadingTitle = 'Loading', loading, disabled, onPress, style }: LoadingButtonProps) => {
  const isDisabled = !!loading || !!disabled;
  return (
    <Pressable style={[styles.btn, style, isDisabled && styles.disabled]} onPress={onPress} disabled={isDisabled}>
      {loading ? <LoadingText base={loadingTitle} style={styles.text} /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  text: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.7 },
});

