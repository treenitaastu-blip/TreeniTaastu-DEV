import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Target, Calendar } from "lucide-react";

interface MonthlyData {
  month: string;
  sessions: number;
  total_volume_kg: number;
  avg_rpe: number;
}

interface EnhancedProgressChartProps {
  monthlyData: MonthlyData[];
  stats: {
    total_sessions: number;
    completion_rate: number;
    total_volume_kg: number;
    current_streak: number;
    avg_rpe: number;
  };
}

const formatNumber = (num: number) => num.toLocaleString("et-EE", { maximumFractionDigits: 1 });
const formatPercent = (num: number) => `${(num * 100).toFixed(1)}%`;

export default function EnhancedProgressChart({ monthlyData, stats }: EnhancedProgressChartProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Sessioonid</span>
          </div>
          <div className="text-2xl font-bold text-primary">{stats.total_sessions}</div>
        </div>
        
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">Lõpetamine</span>
          </div>
          <div className="text-2xl font-bold text-success">{formatPercent(stats.completion_rate)}</div>
        </div>
        
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Kogu maht</span>
          </div>
          <div className="text-2xl font-bold text-accent">{formatNumber(stats.total_volume_kg)} kg</div>
        </div>
        
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Sari</span>
          </div>
          <div className="text-2xl font-bold text-orange-500">{stats.current_streak}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions Chart */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Treeningud kuude kaupa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="sessions" 
                  fill="hsl(var(--primary))" 
                  name="Sessioonid"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Volume Chart */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-accent" />
              Tõstetud kaal kuude kaupa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${formatNumber(value)} kg`, 'Kogu maht']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_volume_kg" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: 'hsl(var(--accent))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* RPE Trend if available */}
      {stats.avg_rpe > 0 && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-purple-500" />
              RPE trend (Tajutud koormus)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  domain={[0, 10]}
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}`, 'Keskmine RPE']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avg_rpe" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}