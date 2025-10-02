import { useEffect } from 'react';
import { useUserLevel } from '@/hooks/useUserLevel';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

export function LevelUpToast() {
  const { hasLeveledUp, levelData, previousLevel, clearLevelUpNotification, getTierIcon } = useUserLevel();
  const { toast } = useToast();

  useEffect(() => {
    if (hasLeveledUp && levelData && previousLevel) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Show toast
      toast({
        title: `🎉 Tase tõusis!`,
        description: `Jõudsid ${levelData.level}. tasemele (${levelData.tier}) ${getTierIcon(levelData.tier)}`,
        duration: 5000,
      });

      // Clear the notification
      clearLevelUpNotification();
    }
  }, [hasLeveledUp, levelData, previousLevel, clearLevelUpNotification, toast, getTierIcon]);

  return null; // This component only handles side effects
}