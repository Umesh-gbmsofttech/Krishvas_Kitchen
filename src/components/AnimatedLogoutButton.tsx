import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS } from '../config/appConfig';

export const AnimatedLogoutButton = ({
  onPress,
  label = 'Logout',
  style,
}: {
  onPress: () => void | Promise<void>;
  label?: string;
  style?: ViewStyle;
}) => {
  return (
    <View style={[styles.wrap, style]}>
      <Pressable style={styles.btn} onPress={onPress}>
        <Text style={styles.text}>{label}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    backgroundColor: '#FBD9C9',
    borderRadius: 14,
    padding: 6,
  },
  btn: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '800' },
});
