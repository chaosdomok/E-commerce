'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertAccountActive,
  BLOCKED_ACCOUNT_MESSAGE,
  BlockedAccountError,
} from '@/lib/account-access';

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationTone;
  is_read: boolean;
  created_at: string;
};

function getNotificationTone(title: string | null, message: string | null): NotificationTone {
  const content = `${title ?? ''} ${message ?? ''}`.toLocaleLowerCase('pl-PL');
  if (content.includes('odrzucon') || content.includes('wygas')) return 'error';
  if (content.includes('anulowan')) return 'warning';
  if (
    content.includes('zatwierdzon') ||
    content.includes('sprzedan') ||
    content.includes('kupion') ||
    content.includes('gotow') ||
    content.includes('utworzon') ||
    content.includes('zmienione') ||
    content.includes('wysłan')
  ) {
    return 'success';
  }
  return 'info';
}

async function getNotificationContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: 'Unauthorized' };
  }

  try {
    await assertAccountActive(user.id, () => supabase.auth.signOut());
  } catch (error) {
    if (error instanceof BlockedAccountError) {
      return {
        ok: false as const,
        blocked: true as const,
        error: BLOCKED_ACCOUNT_MESSAGE,
      };
    }
    throw error;
  }

  return { ok: true as const, supabase, user };
}

export async function getUserNotifications() {
  const context = await getNotificationContext();
  if (!context.ok) return context;
  const { supabase, user } = context;

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching notifications:', error);
    return { error: 'Failed to fetch notifications' };
  }

  return {
    notifications: (data ?? []).map((notification) => ({
      id: notification.id,
      user_id: notification.user_id,
      title: notification.title ?? 'Powiadomienie',
      message: notification.message ?? '',
      is_read: Boolean(notification.read),
      created_at: notification.created_at ?? new Date().toISOString(),
      type: getNotificationTone(notification.title, notification.message),
    })) satisfies Notification[],
  };
}

export async function markNotificationAsRead(notificationId: string) {
  const context = await getNotificationContext();
  if (!context.ok) return context;
  const { supabase, user } = context;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error marking notification as read:', error);
    return { error: 'Failed to mark notification as read' };
  }

  return { success: true };
}

export async function markAllNotificationsAsRead() {
  const context = await getNotificationContext();
  if (!context.ok) return context;
  const { supabase, user } = context;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return { error: 'Failed to mark all notifications as read' };
  }

  return { success: true };
}

export async function getUnreadNotificationCount() {
  const context = await getNotificationContext();
  if (!context.ok) {
    return {
      count: 0,
      error: context.error,
      ...('blocked' in context ? { blocked: context.blocked } : {}),
    };
  }
  const { supabase, user } = context;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return { count: 0 };
  }

  return { count: count || 0 };
}
