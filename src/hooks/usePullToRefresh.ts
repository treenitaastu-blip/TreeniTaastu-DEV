import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  threshold?: number;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  threshold = 80,
  onRefresh,
  disabled = false
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if we're at the top of the page
      if (window.scrollY > 0) return;
      
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || window.scrollY > 0) return;

      touchCurrentY.current = e.touches[0].clientY;
      const pullDistance = Math.max(0, touchCurrentY.current - touchStartY.current);
      
      if (pullDistance > 0) {
        e.preventDefault(); // Prevent default scroll behavior
        setPullDistance(pullDistance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;

      isPulling.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, disabled, pullDistance, isRefreshing]);

  return {
    isRefreshing,
    pullDistance,
    isTriggered: pullDistance >= threshold
  };
};