import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSmartProgression } from "@/hooks/useSmartProgression";
import { ProgramProgressCard } from "./ProgramProgressCard";
import { ProgramCompletionDialog } from "./ProgramCompletionDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  Calendar, 
  BarChart3,
  Clock,
  Target,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SmartProgressDashboardProps {
  programId?: string;
}

export const SmartProgressDashboard = ({ programId }: SmartProgressDashboardProps) => {
  const {
    programProgress,
    loading,
    error,
    autoProgressProgram,
    completeDuePrograms,
    updateProgramSettings,
  } = useSmartProgression(programId);

  const [isAutoProgressing, setIsAutoProgressing] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const { toast } = useToast();

  // Check for program completion on mount and when progress changes
  useEffect(() => {
    if (programProgress?.status === 'completed' && !showCompletionDialog) {
      setShowCompletionDialog(true);
    }
  }, [programProgress?.status]);

  const handleAutoProgress = async () => {
    setIsAutoProgressing(true);
    try {
      const result = await autoProgressProgram();
      if (result?.success) {
        toast({
          title: "Programm uuendatud!",
          description: `${result.updates_made} harjutust uuendati sinu soorituse alusel.`,
        });
      }
    } finally {
      setIsAutoProgressing(false);
    }
  };

  const handleCompleteProgram = async () => {
    try {
      await completeDuePrograms();
      setShowCompletionDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete program. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    // TODO: Implement PDF export functionality
    toast({
      title: "Export Started",
      description: "Your program PDF will be ready for download shortly.",
    });
  };

  const handlePurchaseNew = () => {
    // TODO: Navigate to program selection/purchase
    toast({
      title: "New Program",
      description: "Redirecting to program selection...",
    });
  };

  if (!programId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Progressi Ülevaade</h3>
          <p className="text-muted-foreground">
            Vali konkreetne programm et näha progressi detaile.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading program progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">Failed to load program progress</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!programProgress) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No program progress found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Treeningu Ülevaade</h2>
          <p className="text-muted-foreground">
            Automaatne progressi jälgimine ja programmi haldamine
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Automaatne Progressioon
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden xs:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="progression" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden xs:inline">Progression</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden xs:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgramProgressCard
            programProgress={programProgress}
            onAutoProgress={handleAutoProgress}
            onComplete={handleCompleteProgram}
            isAutoProgressing={isAutoProgressing}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Duration</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-xl sm:text-2xl font-bold">
                  {programProgress.duration_weeks ?? 0} weeks
                </div>
                <p className="text-xs text-muted-foreground">
                  Program length
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Progress</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-xl sm:text-2xl font-bold">
                  {Math.round(programProgress.progress_percentage ?? 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Status</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-xl sm:text-2xl font-bold capitalize">
                  {programProgress.status ?? 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current state
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progression" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progressi Analüüs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm sm:text-base">Automaatne Progressioon Sisse Lülitatud</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Programm kohandub automaatselt sinu soorituse alusel
                    </p>
                  </div>
                  <Button
                    onClick={handleAutoProgress}
                    disabled={isAutoProgressing}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {isAutoProgressing ? 'Uuendab...' : 'Käivita Analüüs'}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    Süsteem analüüsib sinu pingutuse hinnanguid (RPE) eelmisest nädalast
                    ja kohandab automaatselt harjutuste intensiivsust:
                  </p>
                  <ul className="mt-2 ml-4 list-disc space-y-1">
                    <li>RPE &lt; 6: Suurenda kaalu 5-10%</li>
                    <li>RPE 6-8: Säilita praegune intensiivsus</li>
                    <li>RPE &gt; 8.5: Vähenda kaalu 5-10%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Auto-Progression</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically adjust exercises based on performance
                  </p>
                </div>
                <Badge variant={programProgress.auto_progression_enabled ? "default" : "secondary"}>
                  {programProgress.auto_progression_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Program Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    Total length of training program
                  </p>
                </div>
                <Badge variant="outline">
                  {programProgress.duration_weeks ?? 0} weeks
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProgramCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        programProgress={programProgress}
        onExportPDF={handleExportPDF}
        onPurchaseNew={handlePurchaseNew}
        programStats={{
          totalSessions: 12, // TODO: Get from actual data
          completionRate: 85, // TODO: Get from actual data
          strengthGains: "+15%", // TODO: Calculate from actual data
          avgRPE: 7.2, // TODO: Get from actual data
        }}
      />
    </div>
  );
};