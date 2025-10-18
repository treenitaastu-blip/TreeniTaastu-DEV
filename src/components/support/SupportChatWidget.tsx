import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { supportMessageSchema, validateAndSanitize } from '@/lib/validations';

export function SupportChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('supportChatOpen');
    return saved === 'true';
  });
  const [isAnnounced, setIsAnnounced] = useState(() => {
    const saved = localStorage.getItem('supportChatAnnounced');
    return saved === 'true';
  });
  const [newMessage, setNewMessage] = useState('');
  const { messages, loading, sending, sendMessage } = useSupportChat();
  const { notification, markAsRead } = useSupportNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive - moved to top level to follow Rules of Hooks
  useEffect(() => {
    if (!user || !messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && notification.hasUnreadAdminMessages) {
      markAsRead();
    }
  }, [isOpen, notification.hasUnreadAdminMessages, markAsRead]);

  if (!user) {
    if (isAnnounced) {
      return null;
    }
    return (
      <div className="fixed bottom-6 right-6 z-[100]">
        <Alert className="w-80 border-warning/50 relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <button
              onClick={() => {
                setIsAnnounced(true);
                localStorage.setItem('supportChatAnnounced', 'true');
              }}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sulge teadaanne"
            >
              <X className="h-4 w-4" />
            </button>
            <strong>Pole sisse logitud:</strong> Kliendiabi kasutamiseks palun logi sisse.
            <Button
              onClick={() => window.location.href = '/login'}
              className="mt-2 w-full"
              size="sm"
            >
              Mine sisselogimisse
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    
    // Validate input using Zod schema
    const validation = validateAndSanitize(supportMessageSchema, { message: newMessage });
    
    if (!validation.success) {
      console.error("Message validation failed:", validation.errors);
      return;
    }
    
    await sendMessage(validation.data!.message);
    setNewMessage('');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      localStorage.setItem('supportChatOpen', 'false');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('et-EE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[100]">
          <Button
            onClick={() => {
              setIsOpen(true);
              localStorage.setItem('supportChatOpen', 'true');
            }}
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
            {notification.hasUnreadAdminMessages && (
              <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <span className="text-xs text-white font-bold">
                  {notification.unreadCount > 9 ? '9+' : notification.unreadCount}
                </span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 h-96 shadow-xl z-[100] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Kliendiabi</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                localStorage.setItem('supportChatOpen', 'false');
              }}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 py-2">
              {loading && (
                <div className="text-center text-muted-foreground py-4">
                  Laadin sõnumeid...
                </div>
              )}
              
              {!loading && messages.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tere tulemast kliendiabisse!</p>
                  <p className="text-xs mt-1">Kirjutage meile oma küsimus</p>
                </div>
              )}

              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className="max-w-[80%]">
                      <div
                        className={`px-3 py-2 rounded-lg text-sm ${
                          message.is_admin
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {message.message}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
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
             </ScrollArea>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Kirjutage oma sõnum..."
                  disabled={sending}
                  className="flex-1"
                  autoFocus={isOpen}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}