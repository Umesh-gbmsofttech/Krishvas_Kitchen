import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as {
  apiBaseUrl?: string;
  githubRepo?: string;
  buildNumber?: string;
};

const getBaseUrl = () => {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    const lanIp = hostUri?.split(':')[0];
    if (lanIp) return `http://${lanIp}:8080`;
    return 'http://localhost:8080';
  }

  if (extra.apiBaseUrl) return extra.apiBaseUrl;
  return 'https://krishvas-kitchen-server.onrender.com';
};

export const API_BASE_URL = getBaseUrl();
export const APP_NAME = Constants.expoConfig?.name || 'KrishvasKitchen';
export const GITHUB_REPO = extra.githubRepo || 'Umesh-gbmsofttech/Krishvas_Kitchen';
export const BUILD_NUMBER = extra.buildNumber || '1';
export const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const RELEASES_LATEST_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
export const RAZORPAY_KEY = 'rzp_test_placeholder_key';
export const STRIPE_KEY = 'pk_test_placeholder_key';

export const COLORS = {
  bg: '#F4F2EC',
  card: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#6F7175',
  accent: '#FF6A2B',
  accentSoft: '#FFE3D6',
  success: '#2E7D32',
  danger: '#D32F2F',
  chip: '#F0F0F0',
  placeholder: '#97A1AF'
};
