import { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

export const PullToRefresh = ({ children, onRefresh, disabled = false }: PullToRefreshProps) => {
  const { isRefreshing, pullDistance, isTriggered } = usePullToRefresh({
    onRefresh,
    disabled
  });

  return (
    <>
      {/* Pull to refresh indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm transition-all duration-200"
        style={{
          height: Math.min(pullDistance, 80),
          opacity: pullDistance > 0 ? 1 : 0,
          transform: `translateY(${pullDistance > 0 ? 0 : -100}%)`
        }}
      >
        <div className="flex items-center gap-2 text-foreground px-4 py-2">
          <RefreshCw 
            size={20} 
            className={`transition-transform duration-200 ${
              isRefreshing ? 'animate-spin' : isTriggered ? 'rotate-180' : ''
            }`}
          />
          <span className="text-sm font-semibold">
            {isRefreshing 
              ? 'Värskendamine...' 
              : isTriggered 
                ? 'Vabasta värskendamiseks' 
                : 'Tõmba värskendamiseks'
            }
          </span>
        </div>
      </div>

      {/* Main content - no transform to avoid breaking position: fixed */}
      {children}
    </>
  );
};