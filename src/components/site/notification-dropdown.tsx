'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { getUserNotifications, markAllNotificationsAsRead, markNotificationAsRead, type Notification } from '@/actions/notifications';
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
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  error: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const result = await getUserNotifications();
    if (result.notifications && Array.isArray(result.notifications)) {
      setNotifications(result.notifications as unknown as Notification[]);
      setUnreadCount((result.notifications as unknown as Notification[]).filter((n) => !n.is_read).length);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
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
          aria-label="Powiadomienia"
          className="relative hidden sm:flex min-h-[44px] min-w-[44px] h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 backdrop-blur-md transition hover:border-sue/40 hover:text-sue"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sue px-0.5 text-[9px] font-bold text-white ring-2 ring-zinc-950 sm:h-4 sm:min-w-4 sm:px-1 sm:text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 sm:w-96 max-h-[400px] overflow-y-auto border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-0"
      >
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/95 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Powiadomienia</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs text-zinc-400 hover:text-white"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Oznacz wszystkie
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-zinc-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-sue" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="h-10 w-10 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-400">Brak powiadomień</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex items-start gap-3 p-4 hover:bg-zinc-800/50 cursor-pointer"
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-full border p-2 ${typeColors[notification.type]}`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${notification.is_read ? 'text-zinc-400' : 'text-white'}`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="flex h-2 w-2 shrink-0 rounded-full bg-sue" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 text-[10px] text-zinc-600">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
