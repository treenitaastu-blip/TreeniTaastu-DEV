import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  user_id: string;
  status: 'active' | 'closed' | 'archived';
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export const useSupportChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Refs to prevent stale closures in subscriptions
  const currentConversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<SupportMessage[]>([]);
  
  // Update refs when state changes
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Create new conversation
  const createNewConversation = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .insert([{
          user_id: user.id,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setConversations(prev => [data as SupportConversation, ...prev]);
      setCurrentConversationId(data.id);
      setMessages([]);
      
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Viga",
        description: "Vestluse alustamine ebaõnnestus",
        variant: "destructive"
      });
      return null;
    }
  }, [user, toast]);

  // Load messages for a conversation - defined before loadConversations to avoid circular dependency
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Viga",
        description: "Sõnumite laadimine ebaõnnestus",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Load conversations - must be defined after loadMessages since it uses it
  const loadConversations = useCallback(async (autoSelectFirst = true) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations((data || []) as SupportConversation[]);
      
      // Auto-select first conversation if enabled and conversations exist
      if (autoSelectFirst && data && data.length > 0) {
        setCurrentConversationId(data[0].id);
        await loadMessages(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Viga",
        description: "Vestluste ajaloo laadimine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    if (!user || !message.trim()) return;

    let conversationId = currentConversationId;
    
    // Create conversation if none exists
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (!conversationId) return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          message: message.trim(),
          is_admin: false
        }]);

      if (error) throw error;

      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Viga",
        description: "Sõnumi saatmine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  }, [user, currentConversationId, createNewConversation, toast]);

  // Memoized channel names to prevent unnecessary re-subscriptions
  const channelNames = useMemo(() => ({
    conversations: `support-conversations-${user?.id || 'anonymous'}`,
    messages: `support-messages-${user?.id || 'anonymous'}`
  }), [user?.id]);

  // Set up real-time subscriptions with optimization
  useEffect(() => {
    if (!user) return;

    if (import.meta.env.DEV) console.log('Setting up optimized support chat subscriptions...');

    // Add delay for newly created users to allow Realtime to pick up replica identity settings
    const setupDelay = setTimeout(() => {
      // Subscribe to conversation changes with debounced reload
      let conversationTimeout: NodeJS.Timeout;
      const conversationsChannel = supabase
        .channel(channelNames.conversations)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'support_conversations',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            // Debounce conversation reloads
            clearTimeout(conversationTimeout);
            conversationTimeout = setTimeout(() => {
              loadConversations();
            }, 100);
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            // Use secure logger for production safety
            import("@/utils/secureLogger").then(({ warn: logWarn }) => {
              logWarn('Support conversations subscription error (may resolve on retry)', { error: err });
            });
          }
        });

      // Subscribe to message changes with optimistic updates
      const messagesChannel = supabase
        .channel(channelNames.messages)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_messages'
          },
          (payload) => {
            const newMessage = payload.new as SupportMessage;
            
            // Only add message if it's for current conversation and not duplicate
            if (newMessage.conversation_id === currentConversationIdRef.current) {
              setMessages(prev => {
                // Prevent duplicate messages
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            // Use secure logger for production safety
            import("@/utils/secureLogger").then(({ warn: logWarn }) => {
              logWarn('Support messages subscription error (may resolve on retry)', { error: err });
            });
          }
        });

      return () => {
        clearTimeout(conversationTimeout);
        supabase.removeChannel(conversationsChannel);
        supabase.removeChannel(messagesChannel);
      };
    }, 2000); // 2 second delay to allow Realtime to update after user creation

    return () => {
      clearTimeout(setupDelay);
    };
  }, [user, channelNames, loadConversations]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Select a conversation and load its messages
  const selectConversation = useCallback(async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
  }, [loadMessages]);

  return {
    conversations,
    messages,
    currentConversationId,
    loading,
    sending,
    sendMessage,
    createNewConversation,
    selectConversation,
    loadConversations,
    loadMessages
  };
};