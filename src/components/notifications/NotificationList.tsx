import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCheck, 
  Loader2, 
  Volume2, 
  VolumeX,
  Briefcase,
  DollarSign,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type NotificationCategory = 'tasks' | 'payments' | 'messages' | 'ratings' | 'other';

const getCategoryInfo = (category: NotificationCategory) => {
  switch (category) {
    case 'tasks':
      return { label: 'Tasks', icon: Briefcase, color: 'text-blue-500' };
    case 'payments':
      return { label: 'Payments', icon: DollarSign, color: 'text-green-500' };
    case 'messages':
      return { label: 'Messages', icon: MessageSquare, color: 'text-purple-500' };
    case 'ratings':
      return { label: 'Ratings', icon: Star, color: 'text-yellow-500' };
    case 'other':
      return { label: 'Other', icon: AlertCircle, color: 'text-gray-500' };
  }
};

const categorizeNotification = (type: string): NotificationCategory => {
  if (type.includes('task') || type.includes('application') || type.includes('proof')) {
    return 'tasks';
  }
  if (type.includes('payment')) {
    return 'payments';
  }
  if (type.includes('message') || type.includes('comment')) {
    return 'messages';
  }
  if (type.includes('rating')) {
    return 'ratings';
  }
  return 'other';
};

export const NotificationList = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    soundEnabled,
    setSoundEnabled,
    pushEnabled
  } = useNotifications();
  
  const [expandedCategories, setExpandedCategories] = useState<Record<NotificationCategory, boolean>>({
    tasks: true,
    payments: true,
    messages: true,
    ratings: true,
    other: true,
  });

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    const { task_id, room_id } = notification.payload || {};

    if (task_id) {
      navigate(`/task/${task_id}`);
    } else if (room_id) {
      navigate(`/chat/${task_id}`);
    }
  };

  const toggleCategory = (category: NotificationCategory) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Group notifications by category
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const category = categorizeNotification(notification.type);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(notification);
    return acc;
  }, {} as Record<NotificationCategory, typeof notifications>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8"
            title={soundEnabled ? 'Disable sound' : 'Enable sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {!pushEnabled && (
        <div className="px-4 pb-2">
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
            💡 Enable browser notifications in your browser settings for push alerts
          </div>
        </div>
      )}

      <Separator />

      {/* Notification List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            🔔
          </div>
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll notify you when something important happens
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          {Object.entries(groupedNotifications).map(([category, categoryNotifications]) => {
            const { label, icon: Icon, color } = getCategoryInfo(category as NotificationCategory);
            const isExpanded = expandedCategories[category as NotificationCategory];
            const categoryUnreadCount = categoryNotifications.filter(n => !n.read).length;

            return (
              <div key={category} className="border-b last:border-b-0">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category as NotificationCategory)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="font-medium text-sm">{label}</span>
                    <Badge variant="secondary" className="text-xs">
                      {categoryNotifications.length}
                    </Badge>
                    {categoryUnreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {categoryUnreadCount} new
                      </Badge>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {/* Category Notifications */}
                {isExpanded && (
                  <div className="divide-y bg-muted/10">
                    {categoryNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                          !notification.read && 'bg-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </ScrollArea>
      )}
    </div>
  );
};
