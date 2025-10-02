/**
 * Optimized Real-time Subscription Hook
 * Prevents memory leaks and improves performance for 100+ users
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionConfig {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: any) => void;
  debounceMs?: number;
}

interface SubscriptionManager {
  subscribe: (config: SubscriptionConfig) => string;
  unsubscribe: (id: string) => void;
  unsubscribeAll: () => void;
}

/**
 * Optimized subscription hook that prevents memory leaks and manages connections efficiently
 */
export function useOptimizedSubscriptions(): SubscriptionManager {
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const mountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();

    // Remove all channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current.clear();
  }, []);

  // Subscribe to a table with optimizations
  const subscribe = useCallback((config: SubscriptionConfig): string => {
    const subscriptionId = `${config.table}-${Date.now()}-${Math.random()}`;
    
    // Create debounced callback if specified
    const debouncedCallback = config.debounceMs 
      ? (payload: any) => {
          // Clear existing timeout
          const existingTimeout = timeoutsRef.current.get(subscriptionId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Set new timeout
          const timeout = setTimeout(() => {
            if (mountedRef.current) {
              config.callback(payload);
            }
            timeoutsRef.current.delete(subscriptionId);
          }, config.debounceMs);

          timeoutsRef.current.set(subscriptionId, timeout);
        }
      : (payload: any) => {
          if (mountedRef.current) {
            config.callback(payload);
          }
        };

    // Create channel with unique name
    const channelName = `optimized-${subscriptionId}`;
    const channel = supabase.channel(channelName);

    // Configure postgres changes listener
    const pgConfig: any = {
      event: config.event,
      schema: 'public',
      table: config.table,
    };

    if (config.filter) {
      pgConfig.filter = config.filter;
    }

    channel.on('postgres_changes', pgConfig, debouncedCallback);

    // Subscribe and store reference
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${config.table} (${subscriptionId})`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Subscription error for ${config.table} (${subscriptionId})`);
      }
    });

    channelsRef.current.set(subscriptionId, channel);
    return subscriptionId;
  }, []);

  // Unsubscribe from specific subscription
  const unsubscribe = useCallback((id: string) => {
    const channel = channelsRef.current.get(id);
    if (channel) {
      supabase.removeChannel(channel);
      channelsRef.current.delete(id);
    }

    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Unsubscribe from all subscriptions
  const unsubscribeAll = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll
  };
}

/**
 * Hook for optimized support chat subscriptions
 */
export function useOptimizedSupportChat(userId: string | undefined) {
  const subscriptions = useOptimizedSubscriptions();
  const subscriptionIdsRef = useRef<string[]>([]);

  const setupSubscriptions = useCallback((
    onConversationChange: (payload: any) => void,
    onMessageChange: (payload: any) => void
  ) => {
    if (!userId) return;

    // Clear existing subscriptions
    subscriptionIdsRef.current.forEach(id => subscriptions.unsubscribe(id));
    subscriptionIdsRef.current = [];

    // Subscribe to conversation changes with debouncing
    const conversationId = subscriptions.subscribe({
      table: 'support_conversations',
      event: '*',
      filter: `user_id=eq.${userId}`,
      callback: onConversationChange,
      debounceMs: 200 // Debounce rapid changes
    });

    // Subscribe to message changes (no debounce for real-time feel)
    const messageId = subscriptions.subscribe({
      table: 'support_messages',
      event: 'INSERT',
      callback: onMessageChange
    });

    subscriptionIdsRef.current = [conversationId, messageId];
  }, [userId, subscriptions]);

  return { setupSubscriptions };
}

/**
 * Hook for optimized workout progress subscriptions
 */
export function useOptimizedWorkoutProgress(sessionId: string | undefined) {
  const subscriptions = useOptimizedSubscriptions();
  const subscriptionIdRef = useRef<string | null>(null);

  const setupSubscription = useCallback((
    onSetLogChange: (payload: any) => void
  ) => {
    if (!sessionId) return;

    // Clear existing subscription
    if (subscriptionIdRef.current) {
      subscriptions.unsubscribe(subscriptionIdRef.current);
    }

    // Subscribe to set log changes for this session
    const subscriptionId = subscriptions.subscribe({
      table: 'set_logs',
      event: '*',
      filter: `session_id=eq.${sessionId}`,
      callback: onSetLogChange,
      debounceMs: 100 // Small debounce to batch rapid updates
    });

    subscriptionIdRef.current = subscriptionId;
  }, [sessionId, subscriptions]);

  return { setupSubscription };
}

/**
 * Connection pool manager for limiting concurrent connections
 */
class ConnectionPool {
  private static instance: ConnectionPool;
  private activeConnections = 0;
  private readonly maxConnections = 10; // Limit for scalability

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  canCreateConnection(): boolean {
    return this.activeConnections < this.maxConnections;
  }

  addConnection(): void {
    this.activeConnections++;
  }

  removeConnection(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  getStats() {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      available: this.maxConnections - this.activeConnections
    };
  }
}

export const connectionPool = ConnectionPool.getInstance();

