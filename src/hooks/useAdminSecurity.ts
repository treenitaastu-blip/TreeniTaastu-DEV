import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface AdminSecurityCheck {
  isAdmin: boolean | null;
  loading: boolean;
  error: string | null;
  canAccess: (resource: string) => boolean;
  auditLog: (action: string, details?: Record<string, unknown>) => Promise<void>;
}

/**
 * Enhanced admin security hook with server-side validation
 * and audit logging capabilities
 */
export function useAdminSecurity(): AdminSecurityCheck {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use server-side validation function
        const { data, error: rpcError } = await supabase.rpc('ensure_admin_access');
        
        if (rpcError) {
          console.error("Admin validation error:", rpcError);
          setError("Failed to validate admin access");
          setIsAdmin(false);
        } else {
          setIsAdmin(data || false);
        }
      } catch (err) {
        console.error("Admin validation error:", err);
        setError(err instanceof Error ? err.message : "Validation failed");
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    validateAdmin();
  }, [user?.id]);

  const canAccess = (resource: string): boolean => {
    if (loading || isAdmin === null) return false;
    
    // Define resource access rules
    const adminOnlyResources = [
      'templates',
      'template_days', 
      'template_items',
      'user_management',
      'exercise_management',
      'article_management',
      'analytics',
      'system_settings'
    ];

    return isAdmin === true && adminOnlyResources.includes(resource);
  };

  const auditLog = async (action: string, details?: Record<string, unknown>): Promise<void> => {
    if (!user || !isAdmin) return;

    try {
      // Use server-side function to validate and log admin actions
      await supabase.rpc('validate_admin_action', {
        action_type: `${action}${details ? ` - ${JSON.stringify(details)}` : ''}`
      });
    } catch (error) {
      console.error("Failed to log admin action:", error);
    }
  };

  return {
    isAdmin,
    loading,
    error,
    canAccess,
    auditLog,
  };
}