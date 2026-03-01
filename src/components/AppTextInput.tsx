import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { COLORS } from '../config/appConfig';

export const AppTextInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const { placeholderTextColor, ...rest } = props;
  return <TextInput ref={ref} placeholderTextColor={placeholderTextColor ?? COLORS.placeholder} {...rest} />;
});

AppTextInput.displayName = 'AppTextInput';

