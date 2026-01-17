import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Bug, 
  Database, 
  Network, 
  Shield, 
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { errorLogger, ErrorSeverity, ErrorCategory } from '@/utils/errorLogger';

interface ErrorStats {
  total: number;
  by_severity: Record<ErrorSeverity, number>;
  by_category: Record<ErrorCategory, number>;
  unresolved: number;
  last_24h: number;
  last_7d: number;
}

interface ErrorLogEntry {
  id: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export default function ErrorMonitoringDashboard() {
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [recentErrors, setRecentErrors] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, errorsData] = await Promise.all([
        errorLogger.getErrorStats(),
        errorLogger.getRecentErrors(20)
      ]);
      
      setStats(statsData);
      setRecentErrors(errorsData);
    } catch (error) {
      console.error('Failed to load error monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkResolved = async (errorId: string) => {
    try {
      await errorLogger.markErrorResolved(errorId);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to mark error as resolved:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW: return 'bg-green-100 text-green-800';
      case ErrorSeverity.MEDIUM: return 'bg-yellow-100 text-yellow-800';
      case ErrorSeverity.HIGH: return 'bg-orange-100 text-orange-800';
      case ErrorSeverity.CRITICAL: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.AUTH: return <Shield className="h-4 w-4" />;
      case ErrorCategory.DATABASE: return <Database className="h-4 w-4" />;
      case ErrorCategory.NETWORK: return <Network className="h-4 w-4" />;
      case ErrorCategory.WORKOUT: return <Activity className="h-4 w-4" />;
      case ErrorCategory.PROGRESSION: return <TrendingUp className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading error monitoring data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Error Monitoring</h1>
          <p className="text-muted-foreground">Monitor and track application errors</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.last_24h}</div>
                  <div className="text-sm text-muted-foreground">Last 24h</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Bug className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.unresolved}</div>
                  <div className="text-sm text-muted-foreground">Unresolved</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.last_7d}</div>
                  <div className="text-sm text-muted-foreground">Last 7 days</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Severity Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Error Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.by_severity).map(([severity, count]) => (
              <div key={severity} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(severity as ErrorSeverity)}>
                      {severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">{count} errors</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={stats.total > 0 ? (count / stats.total) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Error Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stats.by_category).map(([category, count]) => (
                <div key={category} className="text-center p-4 border rounded-lg">
                  <div className="flex justify-center mb-2">
                    {getCategoryIcon(category as ErrorCategory)}
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {category}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentErrors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recent Errors</h3>
                <p className="text-muted-foreground">
                  Great! No errors have been logged recently.
                </p>
              </div>
            ) : (
              recentErrors.map((error) => (
                <div key={error.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(error.category)}
                      <Badge className={getSeverityColor(error.severity)}>
                        {error.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {error.category}
                      </Badge>
                      {error.resolved && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(error.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium">{error.message}</p>
                    {error.context?.userId && (
                      <p className="text-xs text-muted-foreground">
                        User: {error.context.userId}
                      </p>
                    )}
                    {error.context?.action && (
                      <p className="text-xs text-muted-foreground">
                        Action: {error.context.action}
                      </p>
                    )}
                  </div>

                  {!error.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkResolved(error.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
