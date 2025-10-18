/**
 * Advanced Cache Manager for TreeniTaastu
 * Implements multiple caching strategies for optimal performance
 */

import { supabase } from "@/integrations/supabase/client";

// Cache configuration
const CACHE_CONFIG = {
  // Cache TTL in milliseconds
  TTL: {
    SHORT: 5 * 60 * 1000,      // 5 minutes
    MEDIUM: 15 * 60 * 1000,    // 15 minutes
    LONG: 60 * 60 * 1000,      // 1 hour
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  },
  // Cache size limits
  MAX_SIZE: {
    MEMORY: 50, // Maximum number of items in memory cache
    STORAGE: 100, // Maximum number of items in localStorage cache
  },
  // Cache keys
  KEYS: {
    USER_PROFILE: 'user_profile',
    PT_PROGRAMS: 'pt_programs',
    PT_TEMPLATES: 'pt_templates',
    PT_STATS: 'pt_stats',
    WORKOUT_SESSION: 'workout_session',
    EXERCISE_DATA: 'exercise_data',
    USER_ENTITLEMENTS: 'user_entitlements',
    ACCESS_MATRIX: 'access_matrix',
  }
};

// Cache item interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  version: number;
}

// Cache manager class
class CacheManager {
  private memoryCache = new Map<string, CacheItem<any>>();
  private version = 1;

  constructor() {
    // Initialize cache version
    this.version = this.getCacheVersion();
  }

  /**
   * Get cache version from localStorage
   */
  private getCacheVersion(): number {
    const version = localStorage.getItem('cache_version');
    return version ? parseInt(version) : 1;
  }

  /**
   * Set cache version
   */
  private setCacheVersion(version: number): void {
    localStorage.setItem('cache_version', version.toString());
    this.version = version;
  }

  /**
   * Generate cache key
   */
  private generateKey(baseKey: string, params?: Record<string, any>): string {
    if (!params) return baseKey;
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return `${baseKey}:${paramString}`;
  }

  /**
   * Check if cache item is valid
   */
  private isValid<T>(item: CacheItem<T>): boolean {
    if (!item) return false;
    const now = Date.now();
    return (now - item.timestamp) < item.ttl && item.version === this.version;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string, params?: Record<string, any>): T | null {
    const fullKey = this.generateKey(key, params);
    
    // Check memory cache first
    const memoryItem = this.memoryCache.get(fullKey);
    if (memoryItem && this.isValid(memoryItem)) {
      return memoryItem.data;
    }

    // Check localStorage cache
    try {
      const storedItem = localStorage.getItem(`cache_${fullKey}`);
      if (storedItem) {
        const item: CacheItem<T> = JSON.parse(storedItem);
        if (this.isValid(item)) {
          // Move to memory cache for faster access
          this.memoryCache.set(fullKey, item);
          return item.data;
        } else {
          // Remove expired item
          localStorage.removeItem(`cache_${fullKey}`);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }

    return null;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.MEDIUM, params?: Record<string, any>): void {
    const fullKey = this.generateKey(key, params);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key: fullKey,
      version: this.version
    };

    // Store in memory cache
    this.memoryCache.set(fullKey, item);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${fullKey}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache write error:', error);
    }

    // Cleanup if cache is too large
    this.cleanup();
  }

  /**
   * Remove item from cache
   */
  remove(key: string, params?: Record<string, any>): void {
    const fullKey = this.generateKey(key, params);
    
    // Remove from memory cache
    this.memoryCache.delete(fullKey);
    
    // Remove from localStorage
    localStorage.removeItem(`cache_${fullKey}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear localStorage cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Increment version to invalidate all caches
    this.setCacheVersion(this.version + 1);
  }

  /**
   * Clear cache by pattern
   */
  clearPattern(pattern: string): void {
    // Clear memory cache
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear localStorage cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_') && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Cleanup cache to prevent memory issues
   */
  private cleanup(): void {
    // Cleanup memory cache
    if (this.memoryCache.size > CACHE_CONFIG.MAX_SIZE.MEMORY) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, entries.length - CACHE_CONFIG.MAX_SIZE.MEMORY);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }

    // Cleanup localStorage cache
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    if (cacheKeys.length > CACHE_CONFIG.MAX_SIZE.STORAGE) {
      const items = cacheKeys.map(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: item.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      });
      
      items.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = items.slice(0, items.length - CACHE_CONFIG.MAX_SIZE.STORAGE);
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    storageSize: number;
    version: number;
  } {
    const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    return {
      memorySize: this.memoryCache.size,
      storageSize: cacheKeys.length,
      version: this.version
    };
  }
}

// Create global cache manager instance
export const cacheManager = new CacheManager();

/**
 * Cached data fetchers for common operations
 */

/**
 * Get user profile with caching
 */
export async function getCachedUserProfile(userId: string) {
  const cacheKey = CACHE_CONFIG.KEYS.USER_PROFILE;
  const cached = cacheManager.get(cacheKey, { userId });
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.LONG, { userId });
  return data;
}

/**
 * Get PT programs with caching
 */
export async function getCachedPTPrograms() {
  const cacheKey = CACHE_CONFIG.KEYS.PT_PROGRAMS;
  const cached = cacheManager.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('client_programs')
    .select(`
      id,
      title_override,
      start_date,
      is_active,
      assigned_to,
      template_id,
      inserted_at,
      templates:template_id (
        title,
        goal
      ),
      profiles:assigned_to (
        email,
        full_name
      )
    `)
    .order('inserted_at', { ascending: false });

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.MEDIUM);
  return data;
}

/**
 * Get PT templates with caching
 */
export async function getCachedPTTemplates() {
  const cacheKey = CACHE_CONFIG.KEYS.PT_TEMPLATES;
  const cached = cacheManager.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .order('inserted_at', { ascending: false });

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.LONG);
  return data;
}

/**
 * Get PT stats with caching
 */
export async function getCachedPTStats() {
  const cacheKey = CACHE_CONFIG.KEYS.PT_STATS;
  const cached = cacheManager.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase.rpc('get_pt_system_stats');

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.SHORT);
  return data;
}

/**
 * Get workout session with caching
 */
export async function getCachedWorkoutSession(programId: string, dayId: string) {
  const cacheKey = CACHE_CONFIG.KEYS.WORKOUT_SESSION;
  const cached = cacheManager.get(cacheKey, { programId, dayId });
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('client_items')
    .select(`
      *,
      exercise_alternatives (
        id,
        alternative_name,
        alternative_description,
        alternative_video_url,
        difficulty_level,
        equipment_required,
        muscle_groups
      )
    `)
    .eq('client_day_id', dayId)
    .order('order_in_day');

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.SHORT, { programId, dayId });
  return data;
}

/**
 * Get user entitlements with caching
 */
export async function getCachedUserEntitlements(userId: string) {
  const cacheKey = CACHE_CONFIG.KEYS.USER_ENTITLEMENTS;
  const cached = cacheManager.get(cacheKey, { userId });
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('user_entitlements')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.LONG, { userId });
  return data;
}

/**
 * Get access matrix with caching
 */
export async function getCachedAccessMatrix(userId: string) {
  const cacheKey = CACHE_CONFIG.KEYS.ACCESS_MATRIX;
  const cached = cacheManager.get(cacheKey, { userId });
  
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from('v_access_matrix')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  cacheManager.set(cacheKey, data, CACHE_CONFIG.TTL.LONG, { userId });
  return data;
}

/**
 * Cache invalidation helpers
 */

/**
 * Invalidate PT-related cache
 */
export function invalidatePTCache(): void {
  cacheManager.clearPattern('pt_');
}

/**
 * Invalidate user-related cache
 */
export function invalidateUserCache(userId: string): void {
  cacheManager.clearPattern(`user_${userId}`);
}

/**
 * Invalidate workout session cache
 */
export function invalidateWorkoutCache(programId: string, dayId: string): void {
  cacheManager.remove(CACHE_CONFIG.KEYS.WORKOUT_SESSION, { programId, dayId });
}

/**
 * Invalidate all cache
 */
export function invalidateAllCache(): void {
  cacheManager.clear();
}

/**
 * Preload critical data
 */
export async function preloadCriticalData(userId: string): Promise<void> {
  try {
    await Promise.all([
      getCachedUserProfile(userId),
      getCachedUserEntitlements(userId),
      getCachedAccessMatrix(userId)
    ]);
  } catch (error) {
    console.error('Preload error:', error);
    // Don't throw - preloading is optional
  }
}

/**
 * Cache warming for better performance
 */
export async function warmCache(userId: string): Promise<void> {
  try {
    // Warm cache with commonly accessed data
    await Promise.all([
      getCachedPTPrograms(),
      getCachedPTTemplates(),
      getCachedPTStats()
    ]);
  } catch (error) {
    console.error('Cache warming error:', error);
    // Don't throw - cache warming is optional
  }
}

export default cacheManager;
