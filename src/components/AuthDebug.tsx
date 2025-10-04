import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthDebug() {
  const [status, setStatus] = useState<string>('Ready');
  const [user, setUser] = useState<any>(null);

  const testConnection = async () => {
    setStatus('Testing connection...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus('Connected successfully');
        setUser(data.session?.user || null);
      }
    } catch (err) {
      setStatus(`Connection failed: ${err}`);
    }
  };

  const testSignIn = async () => {
    setStatus('Testing sign in...');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'info@treenitaastu.ee',
        password: 'test123' // You'll need to set this password
      });
      if (error) {
        setStatus(`Sign in error: ${error.message}`);
      } else {
        setStatus('Sign in successful');
        setUser(data.user);
      }
    } catch (err) {
      setStatus(`Sign in failed: ${err}`);
    }
  };

  const testSignOut = async () => {
    setStatus('Signing out...');
    try {
      await supabase.auth.signOut();
      setStatus('Signed out');
      setUser(null);
    } catch (err) {
      setStatus(`Sign out failed: ${err}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🔧 Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>Status:</strong> {status}
        </div>
        {user && (
          <div>
            <strong>User:</strong> {user.email}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={testConnection} variant="outline" size="sm">
            Test Connection
          </Button>
          <Button onClick={testSignIn} variant="outline" size="sm">
            Test Sign In
          </Button>
          <Button onClick={testSignOut} variant="outline" size="sm">
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

