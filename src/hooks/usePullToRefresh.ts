import { useState, useCallback, useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80, 
  disabled = false 
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (disabled || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
      setCanRefresh(false);
      setIsTriggered(false);
    }
  }, [onRefresh, disabled, isRefreshing]);

  const resetPullState = useCallback(() => {
    setPullDistance(0);
    setIsPulling(false);
    setCanRefresh(false);
    setIsTriggered(false);
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
      
      // Check if we're at the top of the page
      isAtTop.current = window.scrollY === 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || isRefreshing || !isAtTop.current) return;
      
      currentY.current = e.touches[0].clientY;
      const distance = currentY.current - startY.current;
      
      if (distance > 0) {
        e.preventDefault(); // Prevent default pull-to-refresh
        setPullDistance(Math.min(distance, threshold * 1.5));
        setIsPulling(true);
        const shouldTrigger = distance >= threshold;
        setCanRefresh(shouldTrigger);
        setIsTriggered(shouldTrigger);
      }
    };

    const handleTouchEnd = async () => {
      if (disabled || isRefreshing || !isPulling) return;
      
      if (canRefresh && !isRefreshing) {
        await handleRefresh();
      } else {
        resetPullState();
      }
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing, isPulling, canRefresh, threshold, handleRefresh, resetPullState]);

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    canRefresh,
    isTriggered,
    handleRefresh,
    resetPullState,
    setPullDistance,
    setIsPulling,
    setCanRefresh,
  };
}
