import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSupportChat, SupportConversation, SupportMessage } from '@/hooks/useSupportChat';
import { useAuth } from '@/hooks/useAuth';

export default function CustomerService() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState('');
  const { 
    conversations, 
    messages, 
    currentConversationId,
    loading, 
    sending, 
    sendMessage, 
    createNewConversation,
    selectConversation,
    loadConversations
  } = useSupportChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (currentConversationId && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [currentConversationId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;

    const message = newMessage;
    setNewMessage('');
    await sendMessage(message);
  };

  const handleNewConversation = async () => {
    const conversationId = await createNewConversation();
    if (conversationId) {
      await selectConversation(conversationId);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    await selectConversation(conversationId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just nüüd';
    if (diffMins < 60) return `${diffMins} min tagasi`;
    if (diffHours < 24) return `${diffHours} h tagasi`;
    if (diffDays < 7) return `${diffDays} päeva tagasi`;
    
    return date.toLocaleDateString('et-EE', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('et-EE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString('et-EE', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getConversationPreview = (conversationId: string) => {
    const conversationMessages = messages.filter(m => m.conversation_id === conversationId);
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    if (!lastMessage) return 'Pole sõnumeid';
    return lastMessage.message.length > 50 
      ? lastMessage.message.substring(0, 50) + '...' 
      : lastMessage.message;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Laen...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login', { state: { from: '/kasutajatugi' } });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Kasutajatugi
              </h1>
              <p className="text-muted-foreground">Esitage küsimus või jätkake eelnevat vestlust</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-[calc(100vh-250px)]">
          {/* Conversations Sidebar */}
          <Card className="overflow-hidden flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Vestlused</CardTitle>
                <Button
                  onClick={handleNewConversation}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Uus
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {loading && conversations.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Pole veel vestlusi</p>
                      <Button
                        onClick={handleNewConversation}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        Alusta uut vestlust
                      </Button>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentConversationId === conv.id
                            ? 'bg-primary/10 border-2 border-primary'
                            : 'hover:bg-muted/50 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              Vestlus #{conversations.indexOf(conv) + 1}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {getConversationPreview(conv.id)}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatLastMessageTime(conv.last_message_at)}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {conv.status === 'active' ? 'Aktiivne' : conv.status}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="flex flex-col overflow-hidden">
            {currentConversationId ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Sõnumid</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                  <ScrollArea className="flex-1 px-4 py-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Pole veel sõnumeid</p>
                        <p className="text-xs mt-1">Kirjutage oma küsimus allpool</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className="max-w-[75%]">
                              <div
                                className={`px-4 py-3 rounded-lg ${
                                  message.is_admin
                                    ? 'bg-muted text-foreground'
                                    : 'bg-primary text-primary-foreground'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.message}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {message.is_admin && (
                                  <Badge variant="secondary" className="text-xs">
                                    Admin
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(message.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="border-t p-4">
                    <div className="flex gap-2">
                      <Input
                        ref={messageInputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Kirjutage oma küsimus..."
                        disabled={sending}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        size="icon"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Valige vestlus</p>
                  <p className="text-sm mb-4">Valige vasakult vestlus või looge uus</p>
                  <Button onClick={handleNewConversation} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Alusta uut vestlust
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
