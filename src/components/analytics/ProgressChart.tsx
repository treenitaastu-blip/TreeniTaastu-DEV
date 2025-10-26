import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Target } from 'lucide-react';

interface WeeklyData {
  week_start: string;
  sessions: number;
  volume_kg: number;
  avg_rpe: number;
}

interface ProgressChartProps {
  weeklyData: WeeklyData[];
  stats: {
    total_sessions: number;
    completion_rate: number;
    total_volume_kg: number;
    avg_rpe: number;
  };
}

export default function ProgressChart({ weeklyData, stats }: ProgressChartProps) {
  const formatNumber = (num: number) => num.toLocaleString("et-EE", { maximumFractionDigits: 1 });
  const formatPercent = (num: number) => `${(num * 100).toFixed(0)}%`;

  // Reverse data for chronological order
  const chartData = [...weeklyData].reverse();

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessioonid</p>
                <p className="text-2xl font-bold text-primary">{stats.total_sessions}</p>
              </div>
              <Activity className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lõpetamine</p>
                <p className="text-2xl font-bold text-success">{formatPercent(stats.completion_rate)}</p>
              </div>
              <Target className="h-8 w-8 text-success/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maht (kg)</p>
                <p className="text-2xl font-bold text-accent">{formatNumber(stats.total_volume_kg)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent/60" />
            </div>
          </CardContent>
        </Card>

      </div>


      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Session Volume Chart */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Nädala Maht
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week_start" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatNumber(value), 'Maht (kg)']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="volume_kg" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Count Chart */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              Nädala Sessioonid
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week_start" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value, 'Sessioonid']}
                  />
                  <Bar 
                    dataKey="sessions" 
                    fill="hsl(var(--accent))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RPE Trend */}
      {stats.avg_rpe > 0 && (
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              RPE Trend (Tajutud Koormus)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.filter(d => d.avg_rpe > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week_start" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    domain={[1, 10]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value.toFixed(1), 'Keskmine RPE']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_rpe" 
                    stroke="rgb(147 51 234)" 
                    strokeWidth={3}
                    dot={{ fill: 'rgb(147 51 234)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'rgb(147 51 234)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}