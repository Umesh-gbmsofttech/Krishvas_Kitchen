import Constants from 'expo-constants';

const getBaseUrl = () => {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    const lanIp = hostUri?.split(':')[ 0 ];
    return `http://${lanIp}:8080`;
  }

  return 'https://krishvas-kitchen-server.onrender.com';
};

export const BASE_URL = getBaseUrl();
export const API_BASE = `${BASE_URL}/api`;
console.log('Using API:', API_BASE);

export default API_BASE;
