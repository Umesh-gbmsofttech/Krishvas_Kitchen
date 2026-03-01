import { Client } from '@stomp/stompjs';
import { API_BASE_URL } from '../config/appConfig';

let client: Client | null = null;

const wsBase = API_BASE_URL.replace(/^http/, 'ws');

export const connectRealtime = (
  token: string,
  subscriptions: { topic: string; onMessage: (payload: any) => void }[]
) => {
  if (client?.active) return client;

  client = new Client({
    brokerURL: `${wsBase}/ws`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    debug: () => {},
  });

  client.onConnect = () => {
    subscriptions.forEach((s) => {
      client?.subscribe(s.topic, (frame) => {
        try {
          s.onMessage(JSON.parse(frame.body));
        } catch {
          s.onMessage(frame.body);
        }
      });
    });
  };

  client.activate();
  return client;
};

export const disconnectRealtime = () => {
  if (client) {
    client.deactivate();
    client = null;
  }
};
