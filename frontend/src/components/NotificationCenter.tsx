import React, { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useSSE } from '../hooks/useSSE';
import NotificationPortal from './NotificationPortal';

interface Notification {
  id: string;
  type: 'withdrawal' | 'order' | 'system' | 'security' | 'bonus';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  userId?: string;
  adminOnly?: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
  read?: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { lastEvent } = useSSE();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notification history on mount
  useEffect(() => {
    loadNotificationHistory();
  }, []);

  // Handle SSE events for real-time notifications
  useEffect(() => {
    if (lastEvent && lastEvent.type === 'orderUpdated' && lastEvent.data) {
      // Check if it's a notification event
      if (lastEvent.data.type) {
        addNotification(lastEvent.data);
      }
    }
  }, [lastEvent]);

  const loadNotificationHistory = async () => {
    try {
      const response = await fetch('/api/v1/notifications/history', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const notificationsWithRead = result.data.map((notif: any) => ({
            ...notif,
            timestamp: new Date(notif.timestamp),
            read: !!notif.read_at // Convert read_at to boolean
          }));
          setNotifications(notificationsWithRead);
          const unreadNotifications = notificationsWithRead.filter((notif: Notification) => !notif.read);
          setUnreadCount(unreadNotifications.length);
        }
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const addNotification = (notification: Notification) => {
    const newNotification = {
      ...notification,
      timestamp: new Date(notification.timestamp),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep max 50
    setUnreadCount(prev => prev + 1);
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg'
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        console.error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(notif => !notif.read);
    
    try {
      // Mark all unread notifications as read in parallel
      const markPromises = unreadNotifications.map(notif => 
        fetch(`/api/v1/notifications/${notif.id}/read`, {
          method: 'PUT',
          credentials: 'include'
        })
      );
      
      await Promise.all(markPromises);
      
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const removeNotification = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    // Mark as read if not already read before removing
    if (notification && !notification.read) {
      try {
        await fetch(`/api/v1/notifications/${notificationId}/read`, {
          method: 'PUT',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Error marking notification as read before removal:', error);
      }
    }
    
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    setUnreadCount(prev => {
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };



  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle Escape key to close notifications panel
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <NotificationPortal>
          {/* Backdrop para cerrar al hacer click fuera */}
          <div 
            className="fixed inset-0 z-[1990]" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Panel de notificaciones */}
          <aside
            className="fixed right-6 top-24 z-[2000] w-80 sm:w-96 max-h-[70vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200"
            role="dialog"
            aria-modal="true"
            aria-label="Notificaciones"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Marcar todas como leídas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getSeverityIcon(notification.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.timestamp)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </NotificationPortal>
      )}
    </div>
  );
};

export default NotificationCenter;