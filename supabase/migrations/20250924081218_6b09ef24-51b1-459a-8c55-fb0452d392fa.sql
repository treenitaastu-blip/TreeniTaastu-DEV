-- Create support chat tables
CREATE TABLE public.support_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance
CREATE INDEX idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX idx_support_conversations_updated_at ON public.support_conversations(updated_at DESC);
CREATE INDEX idx_support_messages_conversation_id ON public.support_messages(conversation_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at);

-- Add triggers for updated_at
CREATE TRIGGER update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for support_conversations
-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.support_conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.support_conversations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON public.support_conversations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON public.support_conversations
  FOR SELECT
  USING (is_admin());

-- Admins can update all conversations
CREATE POLICY "Admins can update all conversations"
  ON public.support_conversations
  FOR UPDATE
  USING (is_admin());

-- RLS Policies for support_messages
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON public.support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations sc
      WHERE sc.id = support_messages.conversation_id
      AND sc.user_id = auth.uid()
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in own conversations"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    is_admin = false AND
    EXISTS (
      SELECT 1 FROM public.support_conversations sc
      WHERE sc.id = support_messages.conversation_id
      AND sc.user_id = auth.uid()
    )
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.support_messages
  FOR SELECT
  USING (is_admin());

-- Admins can send messages to any conversation
CREATE POLICY "Admins can send messages"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (is_admin() AND sender_id = auth.uid() AND is_admin = true);

-- Function to archive old conversations when creating new ones
CREATE OR REPLACE FUNCTION public.archive_old_conversations()
RETURNS TRIGGER AS $$
BEGIN
  -- Archive previous active conversations for this user
  UPDATE public.support_conversations
  SET status = 'archived',
      updated_at = now()
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to archive old conversations
CREATE TRIGGER archive_old_conversations_trigger
  AFTER INSERT ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_old_conversations();

-- Function to update conversation timestamp when new message is added
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_conversations
  SET last_message_at = now(),
      updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;