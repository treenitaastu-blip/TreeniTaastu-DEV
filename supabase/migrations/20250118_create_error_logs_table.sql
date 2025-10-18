-- Create error logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL CHECK (category IN ('auth', 'database', 'network', 'validation', 'workout', 'progression', 'payment', 'ui', 'system')),
    message TEXT NOT NULL,
    stack TEXT,
    context JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON public.error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_context_user_id ON public.error_logs USING GIN ((context->>'userId'));

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_error_logs_updated_at
    BEFORE UPDATE ON public.error_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_error_logs_updated_at();

-- Create RLS policies
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own errors
CREATE POLICY "Users can insert their own error logs" ON public.error_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (context->>'userId')::uuid = auth.uid() OR
        (context->>'userId') IS NULL
    );

-- Policy for admins to view all error logs
CREATE POLICY "Admins can view all error logs" ON public.error_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for admins to update error logs
CREATE POLICY "Admins can update error logs" ON public.error_logs
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for users to view their own error logs
CREATE POLICY "Users can view their own error logs" ON public.error_logs
    FOR SELECT
    TO authenticated
    USING (
        (context->>'userId')::uuid = auth.uid() OR
        (context->>'userId') IS NULL
    );

-- Create function to get error statistics
CREATE OR REPLACE FUNCTION public.get_error_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_severity', jsonb_build_object(
            'low', COUNT(*) FILTER (WHERE severity = 'low'),
            'medium', COUNT(*) FILTER (WHERE severity = 'medium'),
            'high', COUNT(*) FILTER (WHERE severity = 'high'),
            'critical', COUNT(*) FILTER (WHERE severity = 'critical')
        ),
        'by_category', jsonb_build_object(
            'auth', COUNT(*) FILTER (WHERE category = 'auth'),
            'database', COUNT(*) FILTER (WHERE category = 'database'),
            'network', COUNT(*) FILTER (WHERE category = 'network'),
            'validation', COUNT(*) FILTER (WHERE category = 'validation'),
            'workout', COUNT(*) FILTER (WHERE category = 'workout'),
            'progression', COUNT(*) FILTER (WHERE category = 'progression'),
            'payment', COUNT(*) FILTER (WHERE category = 'payment'),
            'ui', COUNT(*) FILTER (WHERE category = 'ui'),
            'system', COUNT(*) FILTER (WHERE category = 'system')
        ),
        'unresolved', COUNT(*) FILTER (WHERE resolved = false),
        'last_24h', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
        'last_7d', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
    )
    INTO result
    FROM public.error_logs;
    
    RETURN result;
END;
$$;

-- Create function to get recent errors
CREATE OR REPLACE FUNCTION public.get_recent_errors(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    severity TEXT,
    category TEXT,
    message TEXT,
    stack TEXT,
    context JSONB,
    resolved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        el.id,
        el.severity,
        el.category,
        el.message,
        el.stack,
        el.context,
        el.resolved,
        el.created_at,
        el.updated_at
    FROM public.error_logs el
    ORDER BY el.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Create function to mark error as resolved
CREATE OR REPLACE FUNCTION public.mark_error_resolved(p_error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.error_logs
    SET resolved = true, updated_at = NOW()
    WHERE id = p_error_id;
    
    RETURN FOUND;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_error_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_errors(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_error_resolved(UUID) TO authenticated;

-- Update table statistics
ANALYZE public.error_logs;
