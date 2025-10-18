import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SupportNotification {
  hasUnreadAdminMessages: boolean;
  unreadCount: number;
  lastAdminMessageAt: string | null;
}

export const useSupportNotifications = () => {
  const { user } = useAuth();
  const [notification, setNotification] = useState<SupportNotification>({
    hasUnreadAdminMessages: false,
    unreadCount: 0,
    lastAdminMessageAt: null
  });
  const [loading, setLoading] = useState(false);

  // Check for unread admin messages
  const checkUnreadMessages = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get the user's last seen timestamp
      const lastSeenKey = `support_last_seen_${user.id}`;
      const lastSeen = localStorage.getItem(lastSeenKey);
      
      // If no last seen timestamp, set it to now to avoid showing old notifications
      if (!lastSeen) {
        localStorage.setItem(lastSeenKey, new Date().toISOString());
        setNotification({
          hasUnreadAdminMessages: false,
          unreadCount: 0,
          lastAdminMessageAt: null
        });
        return;
      }
      
      const lastSeenDate = new Date(lastSeen);

      console.log('Checking unread messages for user:', user.id);
      console.log('Last seen:', lastSeenDate.toISOString());

      // Get admin messages after last seen
      const { data: adminMessages, error } = await supabase
        .from('support_messages')
        .select('id, created_at, conversation_id')
        .eq('is_admin', true)
        .gte('created_at', lastSeenDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const unreadCount = adminMessages?.length || 0;
      const hasUnread = unreadCount > 0;
      const lastAdminMessage = adminMessages?.[0]?.created_at || null;

      console.log('Found unread messages:', unreadCount, 'hasUnread:', hasUnread);

      setNotification({
        hasUnreadAdminMessages: hasUnread,
        unreadCount,
        lastAdminMessageAt: lastAdminMessage
      });

    } catch (error) {
      console.error('Error checking unread messages:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark messages as read
  const markAsRead = useCallback(() => {
    if (!user) return;

    console.log('Marking messages as read for user:', user.id);
    
    const lastSeenKey = `support_last_seen_${user.id}`;
    localStorage.setItem(lastSeenKey, new Date().toISOString());

    setNotification(prev => ({
      ...prev,
      hasUnreadAdminMessages: false,
      unreadCount: 0
    }));
  }, [user]);

  // Set up real-time subscription for new admin messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`support-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `is_admin=eq.true`
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Check if this message is for this user's conversation
          supabase
            .from('support_conversations')
            .select('user_id')
            .eq('id', newMessage.conversation_id)
            .single()
            .then(({ data }) => {
              if (data?.user_id === user.id) {
                setNotification(prev => ({
                  hasUnreadAdminMessages: true,
                  unreadCount: prev.unreadCount + 1,
                  lastAdminMessageAt: newMessage.created_at
                }));
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Check for unread messages on mount (only if user has been active)
  useEffect(() => {
    if (user) {
      // Add a small delay to let real-time subscriptions settle first
      const timer = setTimeout(() => {
        checkUnreadMessages();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, checkUnreadMessages]);

  return {
    notification,
    loading,
    checkUnreadMessages,
    markAsRead
  };
};
