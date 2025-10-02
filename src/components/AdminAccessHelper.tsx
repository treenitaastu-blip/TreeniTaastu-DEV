import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function AdminAccessHelper() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await supabase.rpc('debug_auth_status');
        setDebugInfo(data);
        setIsAdmin((data as any)?.is_admin_no_param || false);
      } catch (error) {
        console.error('Error checking status:', error);
      }
    };

    checkStatus();
  }, [user]);

  const steps = [
    {
      id: 'login',
      title: 'Log In',
      description: 'Log in as kraavi.henri@gmail.com',
      completed: !!user,
      action: !user ? () => window.location.href = '/login' : undefined,
      icon: User
    },
    {
      id: 'admin',
      title: 'Admin Access',
      description: 'Verify admin privileges',
      completed: isAdmin,
      action: undefined,
      icon: Shield
    },
    {
      id: 'dashboard',
      title: 'Access Dashboard',
      description: 'Go to admin support dashboard',
      completed: false,
      action: (user && isAdmin) ? () => window.location.href = '/admin/support' : undefined,
      icon: ArrowRight
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Access Setup
          </CardTitle>
          <CardDescription>
            Follow these steps to access the admin dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {debugInfo && (
            <Alert className="border-blue-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Status:</strong> {user ? `Logged in as ${user.email}` : 'Not logged in'} | 
                Admin: {isAdmin ? 'Yes' : 'No'} | 
                Conversations: {debugInfo.conversations_count}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    step.completed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-muted/50 border-border'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>

                  {step.action && (
                    <Button onClick={step.action} size="sm">
                      <Icon className="h-4 w-4 mr-2" />
                      {step.id === 'login' ? 'Login' : 'Access'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {user && isAdmin && (
            <Alert className="border-green-500/50 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Ready!</strong> You can now access the admin dashboard to view all customer conversations.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}