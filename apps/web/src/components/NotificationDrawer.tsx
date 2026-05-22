import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../stores/notificationStore';
import { formatRelativeTime } from '../lib/utils';
import { Bell, X, CheckCheck, Mail, MailOpen, ExternalLink } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  info: <Bell className="h-5 w-5 text-blue-500" />,
  success: <Bell className="h-5 w-5 text-green-500" />,
  warning: <Bell className="h-5 w-5 text-amber-500" />,
  error: <Bell className="h-5 w-5 text-red-500" />,
};

const typeColors: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
  error: 'bg-red-50 border-red-200',
};

export function NotificationDrawer() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    isNotificationDrawerOpen,
    markAsRead,
    markAllAsRead,
    removeNotification,
    setNotificationDrawerOpen,
  } = useNotificationStore();

  if (!isNotificationDrawerOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setNotificationDrawerOpen(false)} />
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">{t('notification.title')}</h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('notification.markAllRead')}
              </button>
            )}
            <button
              onClick={() => setNotificationDrawerOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{t('notification.noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {typeIcons[notification.type] || typeIcons.info}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-500"
                              title="Mark as read"
                            >
                              <MailOpen className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                        {notification.actionable && notification.actionLabel && (
                          <button
                            onClick={notification.onAction}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                          >
                            {notification.actionLabel}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}