import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Clock, Play, Pause, RotateCcw, Minimize2, Maximize2, Timer } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportChat } from '@/hooks/useSupportChat';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { supportMessageSchema, validateAndSanitize } from '@/lib/validations';

export function SupportChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('supportChatOpen');
    return saved === 'true';
  });
  const [newMessage, setNewMessage] = useState('');
  const { messages, loading, sending, sendMessage } = useSupportChat();
  const { notification, markAsRead } = useSupportNotifications();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerMinimized, setTimerMinimized] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isRunning, setIsRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presetTimes = [10, 20, 30, 40, 50, 60];

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            // Audio notification
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.type = 'sine';
              o.frequency.value = 880;
              g.gain.value = 0.001;
              o.start();
              g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
              g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
              o.stop(ctx.currentTime + 0.22);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const formatTimerTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerStart = () => setIsRunning(true);
  const handleTimerPause = () => setIsRunning(false);
  const handleTimerReset = () => {
    setIsRunning(false);
    setTimeLeft(selectedDuration);
  };

  const handlePresetSelect = (duration: number) => {
    setSelectedDuration(duration);
    setTimeLeft(duration);
    setIsRunning(false);
  };

  // Auto-scroll to bottom when new messages arrive or chat opens
  useEffect(() => {
    if (!user || !messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, user]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the chat is fully rendered
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isOpen]);

  // Mark messages as read when user actually interacts with the chat
  useEffect(() => {
    if (isOpen && notification.hasUnreadAdminMessages) {
      // Add a small delay to ensure user sees the notification before clearing it
      const timer = setTimeout(() => {
        markAsRead();
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, notification.hasUnreadAdminMessages, markAsRead]);

  // Debug: Log when chat opens
  useEffect(() => {
    if (isOpen) {
      console.log('Chat opened, form should be visible');
    }
  }, [isOpen]);

  if (!user) {
    return null;
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
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-center gap-2">
          {/* Timer icon for programm page */}
          {location.pathname === '/programm' && (
            <Button
              onClick={() => setTimerOpen(true)}
              className="h-10 w-10 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
              size="icon"
              title="Taimer"
            >
              <Clock className="h-5 w-5" />
            </Button>
          )}
          
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

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4 py-2 min-h-0" ref={scrollAreaRef}>
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
          </CardContent>

          {/* Message Input */}
          <div className="p-4 border-t bg-background flex-shrink-0">
            <form onSubmit={handleSendMessage} className="w-full">
              <div className="flex gap-2 w-full">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Kirjutage oma sõnum..."
                  disabled={sending}
                  className="flex-1 min-w-0"
                  autoFocus={isOpen}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sending}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Timer Modal */}
      {timerOpen && (
        <>
          {timerMinimized ? (
            <div className="fixed bottom-6 left-6 z-[200] bg-card border rounded-lg shadow-lg p-3 min-w-[140px]">
              <div className="flex items-center justify-between gap-2">
                <div className={`text-sm font-bold ${timeLeft === 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatTimerTime(timeLeft)}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={isRunning ? handleTimerPause : handleTimerStart}
                    className="h-6 w-6 p-0"
                  >
                    {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTimerMinimized(false)}
                    className="h-6 w-6 p-0"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
              <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                <span className="font-semibold">Harjutuse taimer</span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTimerMinimized(true)}
                  className="h-8 w-8"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTimerOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timer Display */}
              <div className="text-center">
                <div className={`text-3xl font-bold tabular-nums ${timeLeft === 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatTimerTime(timeLeft)}
                </div>
              </div>

              {/* Preset Time Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {presetTimes.map(time => (
                  <Button
                    key={time}
                    variant={selectedDuration === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(time)}
                    disabled={isRunning}
                    className="text-xs"
                  >
                    {time}s
                  </Button>
                ))}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={isRunning ? handleTimerPause : handleTimerStart}
                  size="sm"
                  className="flex-1"
                  disabled={timeLeft === 0}
                >
                  {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {isRunning ? "Peata" : "Alusta"}
                </Button>
                <Button
                  onClick={handleTimerReset}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {timeLeft === 0 && (
                <div className="text-center text-sm text-destructive font-medium">
                  Aeg läbi! 🎉
                </div>
              )}
            </CardContent>
          </Card>
        </div>
          )}
        </>
      )}
    </>
  );
}