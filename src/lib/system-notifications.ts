import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type SystemNotificationTone = 'info' | 'success' | 'warning' | 'error';

function getNotificationId(eventKey?: string): string {
  if (!eventKey) return randomUUID();
  const hash = createHash('sha256').update(eventKey).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: SystemNotificationTone;
  eventKey?: string;
}) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        id: getNotificationId(params.eventKey),
        user_id: params.userId,
        title: params.title,
        message: params.message,
      });

    if (error) {
      if (error.code === '23505') return { success: true, duplicate: true };
      console.error('Error creating notification:', error);
      return { error: 'Failed to create notification' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { error: 'Failed to create notification' };
  }
}
