'use client';
import { isFrontendPreview } from '@/lib/preview';
import { previewNotifications } from '@/mocks/frontend';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from '@/actions/notifications';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors = {
  info: 'text-info bg-info/10 border-info/20',
  success: 'text-success bg-success/10 border-success/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  error: 'text-danger bg-danger/10 border-danger/20',
};

function redirectBlockedAccount(result: unknown) {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('blocked' in result) ||
    result.blocked !== true
  ) {
    return false;
  }

  window.location.replace('/login?error=account_blocked');
  return true;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(
    isFrontendPreview ? previewNotifications : [],
  );
  const [unreadCount, setUnreadCount] = useState(
    isFrontendPreview
      ? previewNotifications.filter((n) => !n.is_read).length
      : 0,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initialFetchStarted = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUserNotifications();
      if (redirectBlockedAccount(result)) return;
      if (
        'notifications' in result &&
        result.notifications &&
        Array.isArray(result.notifications)
      ) {
        setNotifications(result.notifications as unknown as Notification[]);
        setUnreadCount(
          (result.notifications as unknown as Notification[]).filter(
            (n) => !n.is_read,
          ).length,
        );
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isFrontendPreview) return;
    if (!initialFetchStarted.current) {
      initialFetchStarted.current = true;
      void fetchNotifications();
    }
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => void fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    const result = isFrontendPreview
      ? { success: true }
      : await markNotificationAsRead(id);
    if (redirectBlockedAccount(result)) return;
    if ('success' in result && result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = isFrontendPreview
      ? { success: true }
      : await markAllNotificationsAsRead();
    if (redirectBlockedAccount(result)) return;
    if ('success' in result && result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Wszystkie powiadomienia oznaczone jako przeczytane');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    if (diffHours < 24) return `${diffHours} godz temu`;
    if (diffDays < 7) return `${diffDays} dni temu`;
    return date.toLocaleDateString('pl-PL');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger>
        <button
          type="button"
          aria-label={`Powiadomienia, nieprzeczytane: ${unreadCount}`}
          className="icon-button relative"
        >
          <Bell
            className={`size-5 ${unreadCount > 0 ? 'notification-bell-ringing' : ''}`}
          />
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 rounded-full bg-sue px-1.5 text-[10px] text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        mobileSheetTitle="Powiadomienia"
        className="max-h-[70dvh] w-96 overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-surface p-4 pr-12">
          <h2 className="font-semibold">Powiadomienia</h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="mt-1 -ml-2 text-xs text-sue"
            >
              <CheckCheck className="size-4" />
              Oznacz wszystkie jako przeczytane
            </Button>
          )}
        </div>
        {isLoading ? (
          <div
            role="status"
            aria-label="Ładowanie powiadomień"
            className="space-y-3 p-5"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 skeleton rounded-lg bg-elevated" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nie masz nowych powiadomień.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Info;
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read)
                      void handleMarkAsRead(notification.id);
                  }}
                  className={`items-start gap-3 rounded-none p-4 ${!notification.is_read ? 'bg-unread' : 'bg-surface'}`}
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${typeColors[notification.type] || typeColors.info}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {notification.title}
                      </span>
                      {!notification.is_read && (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-green"
                          aria-label="Nieprzeczytane"
                        />
                      )}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {notification.message}
                    </span>
                    <time
                      dateTime={notification.created_at}
                      title={new Date(notification.created_at).toLocaleString(
                        'pl-PL',
                      )}
                      className="mt-2 block text-xs text-muted-foreground"
                    >
                      {formatTime(notification.created_at)}
                    </time>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
