import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { resolveImageUrl } from '../utils/images';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = Math.round((CARD_WIDTH * 9) / 16);

export const BannerCarousel = ({ banners }: { banners: any[] }) => {
  const listRef = useRef<FlatList>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!banners?.length) return;
    indexRef.current = 0;
    setActiveIndex(0);
  }, [banners]);

  useEffect(() => {
    if (!banners?.length) return;
    const interval = setInterval(() => {
      const nextIndex = (indexRef.current + 1) % banners.length;
      indexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 3500);
    return () => clearInterval(interval);
  }, [banners?.length]);

  if (!banners?.length) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        data={banners}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const uri = resolveImageUrl(item.imageUrl);
          return (
            <View style={styles.card}>
              <Image source={uri ? { uri } : require('../../assets/images/KrishvasKitchen_transparent.png')} style={styles.image} />
              <View style={styles.overlay}>
                <Text style={styles.title}>{item.title}</Text>
                {item.actionLabel ? <Text style={styles.action}>{item.actionLabel}</Text> : null}
              </View>
            </View>
          );
        }}
        onMomentumScrollEnd={(evt) => {
          const offsetX = evt.nativeEvent.contentOffset.x;
          const next = Math.round(offsetX / CARD_WIDTH);
          indexRef.current = next;
          setActiveIndex(next);
        }}
      />
      <View style={styles.dots}>
        {banners.map((b, idx) => (
          <View key={`${b.id}-${idx}`} style={[styles.dot, idx === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '800' },
  action: { color: '#fff', marginTop: 2, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D0D0D0' },
  dotActive: { width: 18, backgroundColor: '#FF6A2B' },
});
