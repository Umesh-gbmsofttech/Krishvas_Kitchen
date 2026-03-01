import { API_BASE_URL } from '../config/appConfig';

export const resolveImageUrl = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
};
