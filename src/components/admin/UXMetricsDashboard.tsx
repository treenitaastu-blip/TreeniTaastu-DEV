import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Activity, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  RefreshCw,
  BarChart3,
  Zap,
  Heart,
  Target,
  Star
} from 'lucide-react';
import { uxMetricsTracker, UXMetricCategory, UXMetricType } from '@/utils/uxMetricsTracker';

interface UXMetricsStats {
  total: number;
  byCategory: Record<UXMetricCategory, number>;
  byType: Record<UXMetricType, number>;
  last24h: number;
  last7d: number;
  avgMetricValues: {
    avgLoadTime?: number;
    avgResponseTime?: number;
    avgSessionDuration?: number;
    avgRating?: number;
  };
}

interface UXMetricEntry {
  id: string;
  user_id?: string;
  session_id?: string;
  category: UXMetricCategory;
  metric_type: UXMetricType;
  metric_value: number;
  metric_unit?: string;
  context: any;
  created_at: string;
}

export default function UXMetricsDashboard() {
  const [stats, setStats] = useState<UXMetricsStats | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<UXMetricEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, metricsData] = await Promise.all([
        uxMetricsTracker.getUXMetricsStats(),
        uxMetricsTracker.getRecentUXMetrics(20)
      ]);
      
      setStats(statsData);
      setRecentMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load UX metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryColor = (category: UXMetricCategory) => {
    switch (category) {
      case UXMetricCategory.ENGAGEMENT: return 'bg-blue-100 text-blue-800';
      case UXMetricCategory.PERFORMANCE: return 'bg-green-100 text-green-800';
      case UXMetricCategory.USABILITY: return 'bg-purple-100 text-purple-800';
      case UXMetricCategory.SATISFACTION: return 'bg-yellow-100 text-yellow-800';
      case UXMetricCategory.CONVERSION: return 'bg-orange-100 text-orange-800';
      case UXMetricCategory.RETENTION: return 'bg-pink-100 text-pink-800';
      case UXMetricCategory.ERROR_RECOVERY: return 'bg-red-100 text-red-800';
      case UXMetricCategory.MOBILE_EXPERIENCE: return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: UXMetricCategory) => {
    switch (category) {
      case UXMetricCategory.ENGAGEMENT: return <Activity className="h-4 w-4" />;
      case UXMetricCategory.PERFORMANCE: return <Zap className="h-4 w-4" />;
      case UXMetricCategory.USABILITY: return <CheckCircle className="h-4 w-4" />;
      case UXMetricCategory.SATISFACTION: return <Heart className="h-4 w-4" />;
      case UXMetricCategory.CONVERSION: return <Target className="h-4 w-4" />;
      case UXMetricCategory.RETENTION: return <Users className="h-4 w-4" />;
      case UXMetricCategory.ERROR_RECOVERY: return <AlertTriangle className="h-4 w-4" />;
      case UXMetricCategory.MOBILE_EXPERIENCE: return <Smartphone className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: UXMetricCategory) => {
    switch (category) {
      case UXMetricCategory.ENGAGEMENT: return 'Engagement';
      case UXMetricCategory.PERFORMANCE: return 'Performance';
      case UXMetricCategory.USABILITY: return 'Usability';
      case UXMetricCategory.SATISFACTION: return 'Satisfaction';
      case UXMetricCategory.CONVERSION: return 'Conversion';
      case UXMetricCategory.RETENTION: return 'Retention';
      case UXMetricCategory.ERROR_RECOVERY: return 'Error Recovery';
      case UXMetricCategory.MOBILE_EXPERIENCE: return 'Mobile Experience';
      default: return 'Unknown';
    }
  };

  const getMetricTypeLabel = (type: UXMetricType) => {
    switch (type) {
      case UXMetricType.PAGE_VIEW: return 'Page Views';
      case UXMetricType.SESSION_DURATION: return 'Session Duration';
      case UXMetricType.FEATURE_USAGE: return 'Feature Usage';
      case UXMetricType.LOAD_TIME: return 'Load Time';
      case UXMetricType.API_RESPONSE_TIME: return 'API Response Time';
      case UXMetricType.TASK_COMPLETION_RATE: return 'Task Completion';
      case UXMetricType.ERROR_RATE: return 'Error Rate';
      case UXMetricType.RATING: return 'User Rating';
      case UXMetricType.TRIAL_CONVERSION: return 'Trial Conversion';
      case UXMetricType.TOUCH_INTERACTION: return 'Touch Interaction';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatMetricValue = (value: number, unit?: string) => {
    if (unit === 'milliseconds') {
      return `${Math.round(value)}ms`;
    }
    if (unit === 'count') {
      return Math.round(value).toString();
    }
    if (unit === 'score') {
      return `${Math.round(value * 10) / 10}/5`;
    }
    if (unit === 'boolean') {
      return value === 1 ? 'Success' : 'Failed';
    }
    return Math.round(value * 100) / 100;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>UX Metrics Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading UX metrics data...</p>
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
          <h1 className="text-2xl font-bold">UX Metrics Dashboard</h1>
          <p className="text-muted-foreground">Track user experience and engagement metrics</p>
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Total Metrics</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.last7d}</div>
                  <div className="text-sm text-muted-foreground">Last 7 days</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats.avgMetricValues.avgRating ? Math.round(stats.avgMetricValues.avgRating * 10) / 10 : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      {stats && stats.avgMetricValues && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {stats.avgMetricValues.avgLoadTime ? Math.round(stats.avgMetricValues.avgLoadTime) : 'N/A'}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Load Time</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {stats.avgMetricValues.avgResponseTime ? Math.round(stats.avgMetricValues.avgResponseTime) : 'N/A'}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {stats.avgMetricValues.avgSessionDuration ? Math.round(stats.avgMetricValues.avgSessionDuration / 60000) : 'N/A'}min
                </div>
                <div className="text-sm text-muted-foreground">Avg Session Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Metrics by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category as UXMetricCategory)}
                    <Badge className={getCategoryColor(category as UXMetricCategory)}>
                      {getCategoryLabel(category as UXMetricCategory)}
                    </Badge>
                    <span className="text-sm font-medium">{count} metrics</span>
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

      {/* Recent Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent UX Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMetrics.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recent Metrics</h3>
                <p className="text-muted-foreground">
                  No UX metrics have been recorded recently.
                </p>
              </div>
            ) : (
              recentMetrics.map((metric) => (
                <div key={metric.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(metric.category)}
                      <Badge className={getCategoryColor(metric.category)}>
                        {getCategoryLabel(metric.category)}
                      </Badge>
                      <Badge variant="outline">
                        {getMetricTypeLabel(metric.metric_type)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(metric.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {formatMetricValue(metric.metric_value, metric.metric_unit)}
                      </span>
                      {metric.metric_unit && (
                        <span className="text-sm text-muted-foreground">
                          {metric.metric_unit}
                        </span>
                      )}
                    </div>
                    {metric.context?.pageUrl && (
                      <p className="text-xs text-muted-foreground">
                        Page: {metric.context.pageUrl}
                      </p>
                    )}
                    {metric.context?.deviceType && (
                      <p className="text-xs text-muted-foreground">
                        Device: {metric.context.deviceType}
                      </p>
                    )}
                    {metric.context?.additionalData?.featureName && (
                      <p className="text-xs text-muted-foreground">
                        Feature: {metric.context.additionalData.featureName}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
