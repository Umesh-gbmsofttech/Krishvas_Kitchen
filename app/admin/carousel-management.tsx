import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppTextInput as TextInput } from '../../src/components/AppTextInput';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/config/appConfig';
import { resolveImageUrl } from '../../src/utils/images';
import { AnimatedHeading } from '../../src/components/AnimatedHeading';

export default function CarouselManagementScreen() {
  const [heroBanners, setHeroBanners] = useState<any[]>([]);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerActionLabel, setBannerActionLabel] = useState('');
  const [bannerPositionOrder, setBannerPositionOrder] = useState('1');
  const [bannerActive, setBannerActive] = useState(true);
  const [bannerImageUri, setBannerImageUri] = useState('');
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerError, setBannerError] = useState('');

  const load = useCallback(async () => {
    const banners = await api.adminBanners();
    setHeroBanners(banners || []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const pickBannerImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (result.canceled) return;
    setBannerImageUri(result.assets[0].uri);
  };

  const saveBanner = async () => {
    if (bannerSaving) return;
    if (!bannerImageUri) {
      setBannerError('Please select banner image');
      return;
    }
    if (!bannerTitle.trim()) {
      setBannerError('Please enter banner title');
      return;
    }
    setBannerSaving(true);
    setBannerError('');
    try {
      const uploaded = await api.uploadImage(
        {
          uri: bannerImageUri,
          name: `hero-${Date.now()}.jpg`,
          type: 'image/jpeg',
        },
        'HERO_BANNER',
        0
      );

      await api.createBanner({
        title: bannerTitle.trim(),
        imageUrl: uploaded.imageUrl,
        actionLabel: bannerActionLabel.trim() || null,
        positionOrder: Number(bannerPositionOrder || 1),
        active: bannerActive,
      });

      setBannerTitle('');
      setBannerActionLabel('');
      setBannerPositionOrder('1');
      setBannerImageUri('');
      setBannerActive(true);
      await load();
    } catch (e: any) {
      setBannerError(e?.response?.data?.message || 'Unable to save hero banner');
    } finally {
      setBannerSaving(false);
    }
  };

  const deleteBanner = async (bannerId: number) => {
    if (bannerSaving) return;
    setBannerSaving(true);
    try {
      await api.deleteBanner(bannerId);
      await load();
    } catch (e: any) {
      setBannerError(e?.response?.data?.message || 'Unable to delete banner');
    } finally {
      setBannerSaving(false);
    }
  };

  const confirmDeleteBanner = (bannerId: number) => {
    Alert.alert('Delete Banner', 'Are you sure you want to delete this banner?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBanner(bannerId) },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
      <AnimatedHeading text="Manage Carousel Images" />
      <View style={styles.card}>
        <TextInput value={bannerTitle} onChangeText={setBannerTitle} style={styles.input} placeholder="Banner title" />
        <TextInput value={bannerActionLabel} onChangeText={setBannerActionLabel} style={styles.input} placeholder="Action label (optional)" />
        <TextInput value={bannerPositionOrder} onChangeText={setBannerPositionOrder} style={styles.input} placeholder="Position order (1,2,3...)" keyboardType="numeric" />
        <Pressable style={[styles.toggleBtn, bannerActive && styles.toggleBtnActive]} onPress={() => setBannerActive((v) => !v)}>
          <Text style={[styles.toggleText, bannerActive && styles.toggleTextActive]}>{bannerActive ? 'Active: Yes' : 'Active: No'}</Text>
        </Pressable>
        <Pressable style={styles.pickBtn} onPress={pickBannerImage}>
          <Text style={styles.pickBtnText}>{bannerImageUri ? 'Change Banner Image' : 'Select Banner Image (16:9)'}</Text>
        </Pressable>
        {bannerImageUri ? <Image source={{ uri: bannerImageUri }} style={styles.preview} /> : null}
        {!!bannerError ? <Text style={styles.error}>{bannerError}</Text> : null}
        <Pressable style={styles.btn} onPress={saveBanner} disabled={bannerSaving}>
          <Text style={styles.btnText}>{bannerSaving ? 'Saving...' : 'Save Hero Banner'}</Text>
        </Pressable>
      </View>

      {heroBanners.map((banner) => (
        <View key={banner.id} style={styles.card}>
          <Image
            source={resolveImageUrl(banner.imageUrl) ? { uri: resolveImageUrl(banner.imageUrl)! } : require('../../assets/images/KrishvasKitchen_transparent.png')}
            style={styles.heroThumb}
          />
          <Text style={styles.bold}>{banner.title}</Text>
          <Text>{banner.actionLabel || '-'}</Text>
          <Text>Position: {banner.positionOrder} | {banner.active ? 'Active' : 'Inactive'}</Text>
          <Pressable style={styles.removeBtn} onPress={() => confirmDeleteBanner(banner.id)}>
            <Text style={styles.removeBtnText}>Delete Banner</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: '900' , textAlign: 'center'},
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginTop: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderWidth: 1, borderColor: '#eee' },
  pickBtn: { backgroundColor: '#111', borderRadius: 10, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  pickBtnText: { color: '#fff', fontWeight: '700' },
  toggleBtn: { backgroundColor: '#efefef', borderRadius: 10, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  toggleBtnActive: { backgroundColor: COLORS.accentSoft },
  toggleText: { color: COLORS.text, fontWeight: '700' },
  toggleTextActive: { color: COLORS.accent },
  preview: { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  btn: { backgroundColor: COLORS.accent, borderRadius: 12, alignItems: 'center', paddingVertical: 12, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  error: { color: COLORS.danger, marginTop: 8 },
  heroThumb: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, marginBottom: 8 },
  bold: { fontWeight: '800' },
  removeBtn: { marginTop: 8, backgroundColor: COLORS.danger, borderRadius: 8, alignItems: 'center', paddingVertical: 8 },
  removeBtnText: { color: '#fff', fontWeight: '700' },
});


