import type { NotificationItem } from '@tgmg/types';
import { storage } from './storage';

const READ_NOTIFICATIONS_KEY = 'tgmg_read_notifications';

function getReadNotificationIds() {
  const raw = storage.getString(READ_NOTIFICATIONS_KEY);
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function setReadNotificationIds(ids: string[]) {
  storage.set(READ_NOTIFICATIONS_KEY, JSON.stringify(ids.slice(0, 200)));
}

export function isNotificationRead(id: string) {
  return getReadNotificationIds().includes(id);
}

export function markNotificationRead(id: string) {
  const next = [id, ...getReadNotificationIds().filter((item) => item !== id)];
  setReadNotificationIds(next);
}

export function markNotificationsRead(ids: string[]) {
  const merged = [...ids, ...getReadNotificationIds()];
  setReadNotificationIds(Array.from(new Set(merged)));
}

export function getUnreadNotifications(notifications: NotificationItem[]) {
  const read = new Set(getReadNotificationIds());
  return notifications.filter((item) => !read.has(item.id));
}

