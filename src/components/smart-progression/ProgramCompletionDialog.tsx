import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Target, 
  Download,
  ShoppingCart,
  Sparkles
} from "lucide-react";
import { ProgramProgress } from "@/hooks/useSmartProgression";

interface ProgramCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programProgress: ProgramProgress | null;
  onExportPDF?: () => void;
  onPurchaseNew?: () => void;
  programStats?: {
    totalSessions: number;
    completionRate: number;
    strengthGains: string;
    avgRPE: number;
  };
}

export const ProgramCompletionDialog = ({
  open,
  onOpenChange,
  programProgress,
  onExportPDF,
  onPurchaseNew,
  programStats,
}: ProgramCompletionDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!onExportPDF) return;
    
    setIsExporting(true);
    try {
      await onExportPDF();
    } finally {
      setIsExporting(false);
    }
  };

  if (!programProgress) return null;

  const downloadTimeLeft = () => {
    if ((programProgress.duration_weeks ?? 0) === 1) return "1 month";
    if ((programProgress.duration_weeks ?? 0) === 4) return "5 weeks";
    return "1 week";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            🎉 Congratulations!
          </DialogTitle>
          <DialogDescription className="text-base">
            You've successfully completed your {programProgress.duration_weeks ?? 0}-week training program!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Achievement Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {programProgress.weeks_elapsed ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Weeks Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(programProgress.progress_percentage ?? 0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Program Stats */}
          {programStats && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Your Performance Summary
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Sessions</span>
                    <Badge variant="secondary">{programStats.totalSessions}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <Badge variant="secondary">{Math.round(programStats.completionRate)}%</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average RPE</span>
                    <Badge variant="secondary">{programStats.avgRPE.toFixed(1)}</Badge>
                  </div>
                  
                  {programStats.strengthGains && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Strength Gains</span>
                      <Badge variant="default" className="bg-green-600">
                        {programStats.strengthGains}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                What's Next?
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <Download className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Export Your Program</div>
                    <div className="text-xs text-muted-foreground">
                      Download available for {downloadTimeLeft()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Continue Your Journey</div>
                    <div className="text-xs text-muted-foreground">
                      Get a new personalized program
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col space-y-2 pt-4">
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="w-full"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          
          <Button
            onClick={onPurchaseNew}
            className="w-full"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Get New Program
          </Button>
          
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};