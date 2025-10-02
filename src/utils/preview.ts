// Preview mode utilities for Lovable integration
export const isPreviewMode = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.location.hostname.includes('lovableproject.com') ||
    window.location.search.includes('__lovable_token') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('vercel.app') ||
    process.env.NODE_ENV === 'development'
  );
};

export const getPreviewUser = () => ({
  id: 'preview-user-id',
  email: 'preview@lovable.dev',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  role: 'admin' // Grant admin access in preview mode
});

export const getPreviewAccess = () => ({
  loading: false,
  isAdmin: true,
  canStatic: true,
  canPT: true,
  reason: 'preview_mode',
  error: null
});