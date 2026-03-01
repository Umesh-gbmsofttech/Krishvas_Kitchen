import { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';

export const LoadingText = ({ base, style }: { base: string; style?: TextStyle }) => {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const id = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : `${prev}.`));
    }, 300);
    return () => clearInterval(id);
  }, []);

  return <Text style={style}>{`${base}${dots}`}</Text>;
};

