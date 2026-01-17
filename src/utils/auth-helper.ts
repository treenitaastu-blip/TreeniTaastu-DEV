// Helper utilities for authentication
export const isDevMode = () => import.meta.env.DEV;

export const debugAuth = (message: string, data?: unknown) => {
  if (isDevMode()) {
    console.log(`[Auth Debug] ${message}`, data);
  }
};

export const createFallbackState = () => ({
  loading: false,
  isAdmin: false,
  canStatic: false,
  canPT: false,
  reason: 'fallback',
  error: null
});