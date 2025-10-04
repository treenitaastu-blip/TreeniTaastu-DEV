import React, { useState, useEffect } from 'react';
import { UpgradePrompt } from './UpgradePrompt';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt as UpgradePromptType } from '@/types/subscription';

interface UpgradePromptManagerProps {
  onUpgrade: (planId: string) => void;
  onDismiss: (promptId: string) => void;
}

export function UpgradePromptManager({ onUpgrade, onDismiss }: UpgradePromptManagerProps) {
  const { getUpgradePrompts, subscription } = useSubscription();
  const [activePrompts, setActivePrompts] = useState<UpgradePromptType[]>([]);
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!subscription) return;

    const prompts = getUpgradePrompts();
    const active = prompts.filter(prompt => !dismissedPrompts.has(prompt.id));
    setActivePrompts(active);
  }, [subscription, getUpgradePrompts, dismissedPrompts]);

  const handleDismiss = (promptId: string) => {
    setDismissedPrompts(prev => new Set([...prev, promptId]));
    onDismiss(promptId);
  };

  // Don't show prompts if user doesn't have a subscription or is on transformation tier
  if (!subscription || subscription.planId === 'transformation') {
    return null;
  }

  // Show only the first active prompt
  const currentPrompt = activePrompts[0];
  if (!currentPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <UpgradePrompt
        prompt={currentPrompt}
        onUpgrade={onUpgrade}
        onDismiss={() => handleDismiss(currentPrompt.id)}
        loading={false}
      />
    </div>
  );
}
