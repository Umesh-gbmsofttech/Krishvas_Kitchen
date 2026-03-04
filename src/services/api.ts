import axios from 'axios';
import { API_BASE_URL } from '../config/appConfig';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

console.log('Using API Base URL:', API_BASE_URL);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error?.config?.method?.toUpperCase?.() || 'REQUEST';
    const url = error?.config?.url || 'unknown-url';
    const status = error?.response?.status || 'NO_STATUS';
    console.log(`API Error: ${method} ${url} -> ${status}`);
    return Promise.reject(error);
  }
);

export const setAuthToken = (token?: string | null) => {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
};

export const api = {
  register: (payload: any) => http.post('/api/auth/register', payload).then((r) => r.data),
  login: (payload: any) => http.post('/api/auth/login', payload).then((r) => r.data),

  myProfile: () => http.get('/api/profile/me').then((r) => r.data),
  updateProfile: (payload: any) => http.put('/api/profile/me', payload).then((r) => r.data),
  updateDeliveryMode: (deliveryModeActive: boolean) => http.patch('/api/profile/delivery-mode', { deliveryModeActive }).then((r) => r.data),

  dailyMenu: (date?: string) => http.get('/api/menus/daily', { params: date ? { date } : undefined }).then((r) => r.data),
  next7Menus: () => http.get('/api/menus/next-7').then((r) => r.data),
  banners: () => http.get('/api/menus/banners').then((r) => r.data),
  menuSuggestions: () => http.get('/api/menus/suggestions').then((r) => r.data),
  scheduledMenus: (start: string, end: string) => http.get('/api/menus/scheduled', { params: { start, end } }).then((r) => r.data),
  createMenu: (payload: any) => http.post('/api/menus', payload).then((r) => r.data),
  updateMenu: (id: number, payload: any) => http.put(`/api/menus/${id}`, payload).then((r) => r.data),
  deleteMenu: (id: number) => http.delete(`/api/menus/${id}`).then((r) => r.data),

  placeOrder: (payload: any) => http.post('/api/orders', payload).then((r) => r.data),
  myOrders: () => http.get('/api/orders/mine').then((r) => r.data),
  allOrders: () => http.get('/api/orders').then((r) => r.data),
  orderById: (orderId: string) => http.get(`/api/orders/${orderId}`).then((r) => r.data),
  myAssignedOrders: () => http.get('/api/orders/assigned/me').then((r) => r.data),
  acceptAssignedOrder: (orderId: string) => http.patch(`/api/orders/${orderId}/accept`).then((r) => r.data),
  verifyDeliveryOtp: (orderId: string, otp: string) => http.patch(`/api/orders/${orderId}/verify-otp`, { otp }).then((r) => r.data),
  updateOrderStatus: (orderId: string, payload: any) => http.patch(`/api/orders/${orderId}/status`, payload).then((r) => r.data),
  assignDelivery: (orderId: string, partnerId: number) => http.patch(`/api/orders/${orderId}/assign/${partnerId}`).then((r) => r.data),

  applyDelivery: (payload: any) => http.post('/api/delivery-partners/apply', payload).then((r) => r.data),
  myDeliveryStatus: () => http.get('/api/delivery-partners/my-status').then((r) => r.data),
  pendingDeliveries: () => http.get('/api/delivery-partners/pending').then((r) => r.data),
  approvedDeliveryPartners: () => http.get('/api/delivery-partners/approved').then((r) => r.data),
  decideDelivery: (partnerId: number, payload: any) =>
    http.patch(`/api/delivery-partners/${partnerId}/decision`, payload).then((r) => r.data),
  updateDeliveryPartner: (partnerId: number, payload: any) =>
    http.patch(`/api/delivery-partners/${partnerId}`, payload).then((r) => r.data),
  deliveryDashboard: () => http.get('/api/delivery-partners/dashboard').then((r) => r.data),

  trackingHistory: (orderId: string) => http.get(`/api/tracking/orders/${orderId}`).then((r) => r.data),
  pushTracking: (orderId: string, payload: any) => http.post(`/api/tracking/orders/${orderId}`, payload).then((r) => r.data),
  mapsConfig: () => http.get('/api/maps/config').then((r) => r.data),
  mapsDirections: (payload: any) => http.post('/api/maps/directions', payload).then((r) => r.data),

  payOrder: (orderId: string, payload: any) => http.post(`/api/payments/orders/${orderId}`, payload).then((r) => r.data),

  notifications: () => http.get('/api/notifications').then((r) => r.data),
  unreadCount: () => http.get('/api/notifications/unread-count').then((r) => r.data),
  markNotificationRead: (id: number) => http.patch(`/api/notifications/${id}/read`).then((r) => r.data),

  adminDashboard: () => http.get('/api/admin/dashboard').then((r) => r.data),
  adminUsers: () => http.get('/api/admin/users').then((r) => r.data),
  adminSettings: () => http.get('/api/admin/settings').then((r) => r.data),
  updateAdminSettings: (payload: { kitchenActive?: boolean; darkMode?: boolean }) =>
    http.patch('/api/admin/settings', payload).then((r) => r.data),
  adminBanners: () => http.get('/api/admin/banners').then((r) => r.data),
  createBanner: (payload: any) => http.post('/api/admin/banners', payload).then((r) => r.data),
  deleteBanner: (id: number) => http.delete(`/api/admin/banners/${id}`).then((r) => r.data),

  uploadImage: async (file: { uri: string; name?: string; type?: string }, referenceType = 'MENU_ITEM', referenceId = 0) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name || `menu-${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    } as any);
    form.append('referenceType', referenceType);
    form.append('referenceId', String(referenceId));
    const response = await http.post('/api/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadProfileImage: async (file: { uri: string; name?: string; type?: string }) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name || `profile-${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    } as any);
    const response = await http.post('/api/profile/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
