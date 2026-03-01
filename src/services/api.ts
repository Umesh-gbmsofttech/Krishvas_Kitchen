import axios from 'axios';
import { API_BASE_URL } from '../config/appConfig';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

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

  dailyMenu: () => http.get('/api/menus/daily').then((r) => r.data),
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
  updateOrderStatus: (orderId: string, payload: any) => http.patch(`/api/orders/${orderId}/status`, payload).then((r) => r.data),
  assignDelivery: (orderId: string, partnerId: number) => http.patch(`/api/orders/${orderId}/assign/${partnerId}`).then((r) => r.data),

  applyDelivery: (payload: any) => http.post('/api/delivery-partners/apply', payload).then((r) => r.data),
  myDeliveryStatus: () => http.get('/api/delivery-partners/my-status').then((r) => r.data),
  pendingDeliveries: () => http.get('/api/delivery-partners/pending').then((r) => r.data),
  decideDelivery: (partnerId: number, approve: boolean) =>
    http.patch(`/api/delivery-partners/${partnerId}/decision`, { approve }).then((r) => r.data),
  deliveryDashboard: () => http.get('/api/delivery-partners/dashboard').then((r) => r.data),

  trackingHistory: (orderId: string) => http.get(`/api/tracking/orders/${orderId}`).then((r) => r.data),
  pushTracking: (orderId: string, payload: any) => http.post(`/api/tracking/orders/${orderId}`, payload).then((r) => r.data),

  payOrder: (orderId: string, payload: any) => http.post(`/api/payments/orders/${orderId}`, payload).then((r) => r.data),

  notifications: () => http.get('/api/notifications').then((r) => r.data),
  unreadCount: () => http.get('/api/notifications/unread-count').then((r) => r.data),
  markNotificationRead: (id: number) => http.patch(`/api/notifications/${id}/read`).then((r) => r.data),

  adminDashboard: () => http.get('/api/admin/dashboard').then((r) => r.data),
  adminUsers: () => http.get('/api/admin/users').then((r) => r.data),
  createBanner: (payload: any) => http.post('/api/admin/banners', payload).then((r) => r.data),
};
