import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUserLevel } from '@/hooks/useUserLevel';
import { User, Trophy, Zap, Target, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserLevelDisplayProps {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export function UserLevelDisplay({ children, size = 'md', showBadge = true }: UserLevelDisplayProps) {
  const { levelData, loading, getTierColor, getTierIcon } = useUserLevel();
  const [open, setOpen] = useState(false);

  if (loading || !levelData) {
    return children || (
      <Avatar className={cn(
        size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
      )}>
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  const avatarSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const badgeSize = size === 'sm' ? 'h-5 w-5 text-[10px]' : size === 'lg' ? 'h-7 w-7 text-sm' : 'h-6 w-6 text-xs';

  const AvatarComponent = (
    <div className="relative">
      <div className={cn(
        "rounded-full p-0.5 bg-gradient-to-r",
        getTierColor(levelData.tier)
      )}>
        <Avatar className={cn(avatarSize, "border-2 border-background")}>
          <AvatarFallback className="bg-muted">
            <User className={cn(
              size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
            )} />
          </AvatarFallback>
        </Avatar>
      </div>
      
      {showBadge && (
        <div className={cn(
          "absolute -bottom-1 -right-1 rounded-full bg-gradient-to-r border-2 border-background flex items-center justify-center font-bold text-white shadow-lg",
          getTierColor(levelData.tier),
          badgeSize
        )}>
          {levelData.level}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children ? (
            <Button variant="ghost" className="p-0 h-auto">
              {AvatarComponent}
            </Button>
          ) : (
            <Button variant="ghost" className="p-0 h-auto">
              {AvatarComponent}
            </Button>
          )}
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn(
                "rounded-full p-0.5 bg-gradient-to-r",
                getTierColor(levelData.tier)
              )}>
                <Avatar className="h-12 w-12 border-2 border-background">
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <div className="text-2xl font-bold">Tase {levelData.level}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <span>{getTierIcon(levelData.tier)}</span>
                  {levelData.tier} aste
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Edenemine {levelData.level + 1}. tasemeni</span>
                <span>{Math.round(levelData.progress)}%</span>
              </div>
              
              <Progress 
                value={levelData.progress} 
                className="h-3"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{levelData.totalXP - levelData.currentLevelXP} XP</span>
                <span>{levelData.xpToNext} XP järgmise tasemeni</span>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold">{levelData.totalXP}</div>
                <div className="text-xs text-muted-foreground">Kogu XP</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <Zap className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{levelData.stats.validWorkouts}</div>
                <div className="text-xs text-muted-foreground">Treeningud</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{levelData.stats.officeResets}</div>
                <div className="text-xs text-muted-foreground">Kontorikeha Reset</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{levelData.stats.perfectHabitDays}</div>
                <div className="text-xs text-muted-foreground">Täiuslikud päevad</div>
              </div>
            </div>

            {/* XP Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="font-medium">Kuidas XP-d teenida:</div>
              <div className="space-y-1 text-muted-foreground">
                <div>• Treening (8+ min): +30 XP</div>
                <div>• Kontorikeha Reset: +15 XP</div>
                <div>• Kõik 4 harjumust päevas: +5 XP</div>
                <div>• Päevane limiit: 60 XP</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}