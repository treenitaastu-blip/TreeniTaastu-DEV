import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Activity, 
  Database, 
  Network, 
  Shield, 
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Bug,
  Calculator,
  BarChart3,
  Zap
} from 'lucide-react';
import { progressionMonitor, ProgressionFailureType } from '@/utils/progressionMonitor';

interface ProgressionAnalysisStats {
  total: number;
  byType: Record<ProgressionFailureType, number>;
  unresolved: number;
  last24h: number;
  last7d: number;
}

interface ProgressionAnalysisEntry {
  id: string;
  user_id: string;
  session_id?: string;
  program_id?: string;
  day_id?: string;
  exercise_id?: string;
  failure_type: ProgressionFailureType;
  error_message: string;
  stack_trace?: string;
  analysis_data: any;
  retry_attempts: number;
  resolved: boolean;
  context: any;
  created_at: string;
  updated_at: string;
}

export default function ProgressionAnalysisDashboard() {
  const [stats, setStats] = useState<ProgressionAnalysisStats | null>(null);
  const [recentFailures, setRecentFailures] = useState<ProgressionAnalysisEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, failuresData] = await Promise.all([
        progressionMonitor.getAnalysisStats(),
        progressionMonitor.getRecentAnalysisFailures(20)
      ]);
      
      setStats(statsData);
      setRecentFailures(failuresData);
    } catch (error) {
      console.error('Failed to load progression analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkResolved = async (failureId: string) => {
    try {
      await progressionMonitor.markAnalysisFailureResolved(failureId);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to mark analysis failure as resolved:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFailureTypeColor = (type: ProgressionFailureType) => {
    switch (type) {
      case ProgressionFailureType.ANALYSIS_FUNCTION_ERROR: return 'bg-red-100 text-red-800';
      case ProgressionFailureType.DATA_VALIDATION_ERROR: return 'bg-orange-100 text-orange-800';
      case ProgressionFailureType.PERMISSION_ERROR: return 'bg-purple-100 text-purple-800';
      case ProgressionFailureType.NETWORK_ERROR: return 'bg-blue-100 text-blue-800';
      case ProgressionFailureType.TIMEOUT_ERROR: return 'bg-yellow-100 text-yellow-800';
      case ProgressionFailureType.INSUFFICIENT_DATA: return 'bg-green-100 text-green-800';
      case ProgressionFailureType.CALCULATION_ERROR: return 'bg-pink-100 text-pink-800';
      case ProgressionFailureType.UNKNOWN_ERROR: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFailureTypeIcon = (type: ProgressionFailureType) => {
    switch (type) {
      case ProgressionFailureType.ANALYSIS_FUNCTION_ERROR: return <Activity className="h-4 w-4" />;
      case ProgressionFailureType.DATA_VALIDATION_ERROR: return <Database className="h-4 w-4" />;
      case ProgressionFailureType.PERMISSION_ERROR: return <Shield className="h-4 w-4" />;
      case ProgressionFailureType.NETWORK_ERROR: return <Network className="h-4 w-4" />;
      case ProgressionFailureType.TIMEOUT_ERROR: return <Clock className="h-4 w-4" />;
      case ProgressionFailureType.INSUFFICIENT_DATA: return <BarChart3 className="h-4 w-4" />;
      case ProgressionFailureType.CALCULATION_ERROR: return <Calculator className="h-4 w-4" />;
      case ProgressionFailureType.UNKNOWN_ERROR: return <Bug className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getFailureTypeLabel = (type: ProgressionFailureType) => {
    switch (type) {
      case ProgressionFailureType.ANALYSIS_FUNCTION_ERROR: return 'Analysis Function Error';
      case ProgressionFailureType.DATA_VALIDATION_ERROR: return 'Data Validation Error';
      case ProgressionFailureType.PERMISSION_ERROR: return 'Permission Error';
      case ProgressionFailureType.NETWORK_ERROR: return 'Network Error';
      case ProgressionFailureType.TIMEOUT_ERROR: return 'Timeout Error';
      case ProgressionFailureType.INSUFFICIENT_DATA: return 'Insufficient Data';
      case ProgressionFailureType.CALCULATION_ERROR: return 'Calculation Error';
      case ProgressionFailureType.UNKNOWN_ERROR: return 'Unknown Error';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Progression Analysis Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading progression analysis data...</p>
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
          <h1 className="text-2xl font-bold">Progression Analysis Monitoring</h1>
          <p className="text-muted-foreground">Track and monitor progression analysis failures</p>
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
                  <div className="text-sm text-muted-foreground">Total Failures</div>
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
                  <div className="text-2xl font-bold">{stats.last24h}</div>
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
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.last7d}</div>
                  <div className="text-sm text-muted-foreground">Last 7 days</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Failure Type Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Failure Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFailureTypeIcon(type as ProgressionFailureType)}
                    <Badge className={getFailureTypeColor(type as ProgressionFailureType)}>
                      {getFailureTypeLabel(type as ProgressionFailureType)}
                    </Badge>
                    <span className="text-sm font-medium">{count} failures</span>
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

      {/* Recent Analysis Failures */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Progression Analysis Failures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentFailures.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recent Failures</h3>
                <p className="text-muted-foreground">
                  Great! No progression analysis failures have been recorded recently.
                </p>
              </div>
            ) : (
              recentFailures.map((failure) => (
                <div key={failure.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getFailureTypeIcon(failure.failure_type)}
                      <Badge className={getFailureTypeColor(failure.failure_type)}>
                        {getFailureTypeLabel(failure.failure_type)}
                      </Badge>
                      {failure.resolved && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                      {failure.retry_attempts > 0 && (
                        <Badge variant="outline">
                          {failure.retry_attempts} retries
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(failure.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium">{failure.error_message}</p>
                    {failure.analysis_data?.exerciseCount && (
                      <p className="text-xs text-muted-foreground">
                        Exercises: {failure.analysis_data.exerciseCount}, Completed: {failure.analysis_data.completedExercises}
                      </p>
                    )}
                    {failure.analysis_data?.rpeData && (
                      <p className="text-xs text-muted-foreground">
                        RPE Data Points: {failure.analysis_data.rpeData.length}
                      </p>
                    )}
                    {failure.analysis_data?.rirData && (
                      <p className="text-xs text-muted-foreground">
                        RIR Data Points: {failure.analysis_data.rirData.length}
                      </p>
                    )}
                  </div>

                  {!failure.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkResolved(failure.id)}
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
