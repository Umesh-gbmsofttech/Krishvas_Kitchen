import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type ScrollViewProps, type ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  containerStyle?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
} & Omit<ScrollViewProps, 'contentContainerStyle'>;

export function KeyboardScreen({
  children,
  containerStyle,
  contentContainerStyle,
  keyboardVerticalOffset = 88,
  ...scrollProps
}: Props) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1 },
});
