import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Admin service client with service role key for admin operations
const supabaseAdmin = createClient(
  'https://dtxbrnrpzepwoxooqwlj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s'
);
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, User, Clock, RefreshCw, AlertCircle, Shield } from 'lucide-react';
import { SupportMessage, SupportConversation } from '@/hooks/useSupportChat';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConversationWithProfile extends SupportConversation {
  user_email?: string;
}

export function SupportChatDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [settingUpAdmin, setSettingUpAdmin] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Refs for auto-scroll and preventing stale closures
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  // Update ref when selection changes
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check authentication and admin status
  const checkAuthStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('debug_auth_status');
      if (error) throw error;
      setDebugInfo(data);
      console.log('Auth status:', data);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }, []);

  // Setup current user as admin
  const makeCurrentUserAdmin = useCallback(async () => {
    setSettingUpAdmin(true);
    try {
      const { data, error } = await supabase.rpc('make_current_user_admin');
      if (error) throw error;
      
      toast({
        title: "Edu",
        description: data || "Oled nüüd administraator"
      });
      
      // Refresh auth status and conversations
      await checkAuthStatus();
      loadConversations();
    } catch (error) {
      console.error('Error setting up admin:', error);
      toast({
        title: "Viga", 
        description: "Administraatori õiguste seadistamine ebaõnnestus. Kontrolli, et oled sisse logitud.",
        variant: "destructive"
      });
    } finally {
      setSettingUpAdmin(false);
    }
  }, [checkAuthStatus, toast]);

  // Test data availability
  const testDataAccess = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('test_admin_login', { 
        test_email: 'kraavi.henri@gmail.com' 
      });
      if (error) throw error;
      setTestResults(data);
      console.log('Test results:', data);
    } catch (error) {
      console.error('Error testing data access:', error);
    }
  }, []);

  // Load all users for proactive messaging
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading all users for support...');
      
      // Get all users from profiles (not just those with conversations)
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      console.log('All users data:', profilesData, profilesError);

      if (profilesError) throw profilesError;

      // Get existing conversations to show which users already have active chats
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('status', 'active');

      console.log('Existing conversations:', conversationsData, conversationsError);

      // Create a map of existing conversations
      const existingConversations = new Map(
        (conversationsData || []).map(conv => [conv.user_id, conv])
      );

      // Create conversation entries for all users
      const allUsersWithConversations: ConversationWithProfile[] = (profilesData || []).map(profile => {
        const existingConv = existingConversations.get(profile.id);
        
        if (existingConv) {
          // User has existing conversation
          return {
            ...existingConv as SupportConversation,
            user_email: profile.email || 'Unknown User',
            user_name: profile.full_name,
            user_created_at: profile.created_at
          };
        } else {
          // User has no conversation - create a virtual entry for proactive messaging
          return {
            id: `new-${profile.id}`, // Virtual ID for new conversations
            user_id: profile.id,
            status: 'new' as any, // Mark as new for UI purposes
            created_at: profile.created_at,
            updated_at: profile.created_at,
            last_message_at: profile.created_at,
            user_email: profile.email || 'Unknown User',
            user_name: profile.full_name,
            user_created_at: profile.created_at
          };
        }
      });
      
      console.log('All users with conversation status:', allUsersWithConversations);
      setConversations(allUsersWithConversations);
      
      // Auto-select first conversation if none selected
      if (allUsersWithConversations.length > 0 && !selectedConversationId) {
        setSelectedConversationId(allUsersWithConversations[0].id);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Viga",
        description: "Kasutajate laadimine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedConversationId, toast]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      
      // Check if this is a new conversation (virtual ID)
      if (conversationId.startsWith('new-')) {
        // This is a new conversation, no messages yet
        setMessages([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      console.log('Messages data:', data, error);

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

  // Enhanced message send with keyboard support
  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || !newMessage.trim() || !user) return;

    setSending(true);
    
    let actualConversationId = selectedConversationId;
    
    // If this is a new conversation, create it first
    if (selectedConversationId.startsWith('new-')) {
      const userId = selectedConversationId.replace('new-', '');
      try {
        const { data: newConversation, error: convError } = await supabaseAdmin
          .from('support_conversations')
          .insert([{
            user_id: userId,
            status: 'active'
          }])
          .select()
          .single();
          
        if (convError) throw convError;
        actualConversationId = newConversation.id;
        
        // Update the conversation ID in state
        setSelectedConversationId(actualConversationId);
        
        // Update the conversation in the list
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversationId 
            ? { ...conv, id: actualConversationId, status: 'active' }
            : conv
        ));
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: "Viga",
          description: "Vestluse loomine ebaõnnestus",
          variant: "destructive"
        });
        setSending(false);
        return;
      }
    }
    
    // Optimistic update
    const tempMessage: SupportMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: actualConversationId,
      sender_id: user.id,
      message: newMessage.trim(),
      is_admin: true,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert([{
          conversation_id: actualConversationId,
          sender_id: user.id,
          message: messageToSend,
          is_admin: true
        }]);

      if (error) throw error;
      
      // Remove temporary message - real one will come via subscription
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove failed message and restore input
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageToSend);
      toast({
        title: "Viga",
        description: "Sõnumi saatmine ebaõnnestus",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  }, [selectedConversationId, newMessage, user, toast]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Close conversation
  const closeConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('support_conversations')
        .update({ status: 'closed' })
        .eq('id', conversationId);

      if (error) throw error;
      
      toast({
        title: "Edu",
        description: "Vestlus suletud"
      });
      
      loadConversations();
    } catch (error) {
      console.error('Error closing conversation:', error);
      toast({
        title: "Viga",
        description: "Vestluse sulgemine ebaõnnestus",
        variant: "destructive"
      });
    }
  }, [loadConversations, toast]);

  // Memoized channel names
  const channelNames = useMemo(() => ({
    conversations: 'admin-support-conversations-optimized',
    messages: 'admin-support-messages-optimized'
  }), []);

  // Optimized real-time subscriptions
  useEffect(() => {
    console.log('Setting up optimized admin support chat subscriptions...');

    let conversationTimeout: NodeJS.Timeout;

    // Subscribe to conversation changes with debouncing
    const conversationsChannel = supabase
      .channel(channelNames.conversations)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations'
        },
        () => {
          clearTimeout(conversationTimeout);
          conversationTimeout = setTimeout(() => {
            loadConversations();
          }, 200);
        }
      )
      .subscribe();

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
          
          // Add message if it's for selected conversation and prevent duplicates
          if (newMessage.conversation_id === selectedConversationIdRef.current) {
            setMessages(prev => {
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(conversationTimeout);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [channelNames, loadConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  // Load conversations on mount and check auth
  useEffect(() => {
    checkAuthStatus();
    testDataAccess();
    loadConversations();
  }, [checkAuthStatus, testDataAccess, loadConversations]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('et-EE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className="space-y-6">
      {/* Debug Info - Remove in production */}
      {debugInfo && (
        <Alert className="border-info/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Debug Info:</strong> Auth: {debugInfo.auth_uid ? 'Yes' : 'No'} | 
            Admin: {debugInfo.is_admin_no_param ? 'Yes' : 'No'} | 
            Conversations: {debugInfo.conversations_count} | 
            Messages: {debugInfo.messages_count}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      {testResults && (
        <Alert className="border-blue-500/50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Data Available:</strong> Conversations: {testResults.conversations} | 
            Active: {testResults.active_conversations} | 
            Messages: {testResults.messages} | 
            Users: {testResults.profiles_count}
          </AlertDescription>
        </Alert>
      )}

      {/* Authentication Status Alert */}
      {debugInfo && !debugInfo.auth_uid && (
        <Alert className="border-destructive/50 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Pole sisse logitud:</strong> Pead sisse logima, et ligipääsu saada administraatori vestlusele.
          </AlertDescription>
        </Alert>
      )}
      
      {debugInfo && debugInfo.auth_uid && !debugInfo.is_admin_no_param && (
        <Alert className="border-warning/50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span><strong>Pole administraator:</strong> Sul on vaja administraatori õigusi, et ligipääsu saada tugivestlusele.</span>
            <Button
              onClick={makeCurrentUserAdmin}
              disabled={settingUpAdmin}
              size="sm"
              variant="outline"
            >
              {settingUpAdmin ? "Seadistan..." : "Tee mind administraatoriks"}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {debugInfo?.auth_uid && debugInfo?.is_admin_no_param && (
        <Alert className="border-success/50 text-success">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Administraatori ligipääs antud:</strong> Saad nüüd ligipääsu kõikidele tugivestluste.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Kõik kasutajad ({conversations.length})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadConversations}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Laadin vestlusi...
                </div>
              )}
              {!loading && conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Kasutajaid ei leitud</p>
                </div>
              )}
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversationId === conversation.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">
                          {conversation.user_email}
                        </span>
                        {conversation.user_name && (
                          <div className="text-xs text-muted-foreground">
                            {conversation.user_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant={conversation.status === 'new' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {conversation.status === 'new' ? 'Uus kasutaja' : conversation.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {conversation.status === 'new' 
                      ? `Registreeritud: ${formatTime(conversation.user_created_at || conversation.created_at)}`
                      : formatTime(conversation.last_message_at)
                    }
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {selectedConversation && (
                <>
                  <User className="h-5 w-5" />
                  Vestlus: {selectedConversation.user_email}
                </>
              )}
              {!selectedConversation && "Vali vestlus"}
            </CardTitle>
            {selectedConversation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeConversation(selectedConversation.id)}
              >
                Sulge vestlus
              </Button>
            )}
          </CardHeader>

          {selectedConversation ? (
            <>
              {/* Messages */}
              <CardContent className="flex-1 p-4">
                <ScrollArea className="h-[300px]">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Sõnumeid pole veel</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[80%]">
                          <div
                            className={`px-4 py-2 rounded-lg ${
                              message.is_admin
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {message.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={message.is_admin ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {message.is_admin ? 'Admin' : 'Klient'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <CardContent className="border-t">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Kirjutage oma vastus..."
                    disabled={sending}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Saada
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Vali vestlus vasakult, et alustada</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}