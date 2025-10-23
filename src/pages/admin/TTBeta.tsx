// src/pages/admin/TTBeta.tsx
// TT Beta - Advanced Exercise System & Template Creation
// This page contains comprehensive instructions for implementing the next generation exercise system

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Search, 
  Filter, 
  Plus, 
  Users, 
  BarChart3, 
  Settings,
  Lightbulb,
  CheckCircle,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import useAccess from '@/hooks/useAccess';

export default function TTBeta() {
  const { isAdmin } = useAccess();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Ainult administraatorid saavad juurdepääsu TT Beta funktsioonidele.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">TT Beta</h1>
          <p className="text-muted-foreground mt-2">
            Next-generation exercise system and template creation
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Zap className="h-4 w-4 mr-1" />
          Beta Features
        </Badge>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="ui">UI Components</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Project Overview
              </CardTitle>
              <CardDescription>
                Comprehensive plan for next-generation exercise system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">CURRENT SYSTEM</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Manual exercise addition in templates</li>
                    <li>• Basic exercise categorization</li>
                    <li>• Exercise archive for assignment</li>
                    <li>• Single-step template creation</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">PLANNED SYSTEM</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Smart exercise library with search/filter</li>
                    <li>• Multi-step template creation</li>
                    <li>• Automatic weight recommendations</li>
                    <li>• Usage analytics and popular exercises</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Key Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">For Admins</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Automatic library building</li>
                    <li>• Usage analytics</li>
                    <li>• Faster template creation</li>
                    <li>• Quality control maintained</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">For Clients</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 2-3 min vs 10-15 min creation</li>
                    <li>• Visual exercise browsing</li>
                    <li>• Consistent naming</li>
                    <li>• Smart recommendations</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Technical</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Enhanced database schema</li>
                    <li>• React components library</li>
                    <li>• Search and filtering</li>
                    <li>• Analytics integration</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Schema Changes
              </CardTitle>
              <CardDescription>
                Enhanced exercise table with advanced categorization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Required Migration:</h4>
                <pre className="text-sm overflow-x-auto">
{`-- Enhanced exercises table
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS:
- muscle_groups TEXT[] -- ['chest', 'triceps', 'shoulders']
- exercise_type TEXT -- 'compound' | 'isolation' | 'bodyweight'
- equipment_required TEXT[] -- ['barbell', 'dumbbells', 'bodyweight']
- difficulty_level INTEGER -- 1-5 scale
- is_unilateral BOOLEAN DEFAULT false
- usage_count INTEGER DEFAULT 0 -- Track popularity
- last_used_at TIMESTAMP

-- Create indexes for performance
CREATE INDEX idx_exercises_muscle_groups ON public.exercises USING GIN (muscle_groups);
CREATE INDEX idx_exercises_equipment ON public.exercises USING GIN (equipment_required);
CREATE INDEX idx_exercises_usage_count ON public.exercises (usage_count DESC);`}
                </pre>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Muscle Groups Categories:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves'].map(group => (
                    <Badge key={group} variant="outline">{group}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Equipment Categories:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {['barbell', 'dumbbells', 'kettlebell', 'bodyweight', 'cables', 'machines', 'resistance_bands', 'medicine_ball'].map(equipment => (
                    <Badge key={equipment} variant="outline">{equipment}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Analytics Tracking:</h4>
                <pre className="text-sm overflow-x-auto">
{`-- Track exercise usage for analytics
CREATE TABLE public.exercise_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES public.exercises(id),
  user_id UUID REFERENCES public.profiles(id),
  template_id UUID REFERENCES public.workout_templates(id),
  used_at TIMESTAMP DEFAULT NOW(),
  usage_type TEXT -- 'template_creation', 'workout_logging'
);

-- Update usage_count trigger
CREATE OR REPLACE FUNCTION update_exercise_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.exercises 
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = NEW.exercise_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exercise_usage
  AFTER INSERT ON public.exercise_usage
  FOR EACH ROW EXECUTE FUNCTION update_exercise_usage_count();`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Components Tab */}
        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Exercise Library Components
              </CardTitle>
              <CardDescription>
                React components for exercise browsing and selection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Required Components:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="font-medium">ExerciseBrowser.tsx</h5>
                    <p className="text-sm text-muted-foreground">
                      Main component for browsing exercises with search, filters, and grid view
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Search input with autocomplete</li>
                      <li>• Filter chips for muscle groups</li>
                      <li>• Equipment filter dropdown</li>
                      <li>• Difficulty slider</li>
                      <li>• Sort options (popularity, alphabetical)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">ExerciseCard.tsx</h5>
                    <p className="text-sm text-muted-foreground">
                      Individual exercise card with selection and preview
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Exercise name and description</li>
                      <li>• Muscle group tags</li>
                      <li>• Equipment requirements</li>
                      <li>• Difficulty indicator</li>
                      <li>• Add to template button</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">ExerciseFilters.tsx</h5>
                    <p className="text-sm text-muted-foreground">
                      Advanced filtering sidebar with multiple criteria
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Muscle group checkboxes</li>
                      <li>• Equipment multi-select</li>
                      <li>• Difficulty range slider</li>
                      <li>• Exercise type radio buttons</li>
                      <li>• Clear filters button</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">ExerciseSearch.tsx</h5>
                    <p className="text-sm text-muted-foreground">
                      Smart search with suggestions and recent searches
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Real-time search suggestions</li>
                      <li>• Recent searches history</li>
                      <li>• Popular searches</li>
                      <li>• Search by muscle group</li>
                      <li>• Search by equipment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Multi-Step Template Creation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Template Creation Flow:</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                    <div>
                      <h5 className="font-medium">Program Setup</h5>
                      <p className="text-sm text-muted-foreground">Basic info, duration, frequency, client level</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                    <div>
                      <h5 className="font-medium">Exercise Selection</h5>
                      <p className="text-sm text-muted-foreground">Browse library, search, filter, add 5-7 exercises per day</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                    <div>
                      <h5 className="font-medium">Exercise Configuration</h5>
                      <p className="text-sm text-muted-foreground">Sets, reps, rest periods, coach notes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">4</div>
                    <div>
                      <h5 className="font-medium">Weight Recommendations</h5>
                      <p className="text-sm text-muted-foreground">Auto-calculated based on client data, age, experience</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Implementation Tab */}
        <TabsContent value="implementation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Implementation Roadmap
              </CardTitle>
              <CardDescription>
                Step-by-step implementation plan with priorities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Phase 1: Database Enhancement (Week 1)</h4>
                </div>
                <div className="ml-7 space-y-2">
                  <p className="text-sm">• Add new columns to exercises table</p>
                  <p className="text-sm">• Create migration for existing data</p>
                  <p className="text-sm">• Add muscle group categorization</p>
                  <p className="text-sm">• Create usage analytics tables</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <h4 className="font-semibold">Phase 2: Exercise Library UI (Week 2)</h4>
                </div>
                <div className="ml-7 space-y-2">
                  <p className="text-sm">• Create ExerciseBrowser component</p>
                  <p className="text-sm">• Implement search and filtering</p>
                  <p className="text-sm">• Add exercise selection interface</p>
                  <p className="text-sm">• Create ExerciseCard component</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold">Phase 3: Multi-Step Template Creation (Week 3)</h4>
                </div>
                <div className="ml-7 space-y-2">
                  <p className="text-sm">• Redesign template creation flow</p>
                  <p className="text-sm">• Add exercise selection step</p>
                  <p className="text-sm">• Implement weight recommendations</p>
                  <p className="text-sm">• Add progress indicators</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <h4 className="font-semibold">Phase 4: Smart Features (Week 4)</h4>
                </div>
                <div className="ml-7 space-y-2">
                  <p className="text-sm">• Usage tracking and analytics</p>
                  <p className="text-sm">• "Recently used" and "Popular" sections</p>
                  <p className="text-sm">• Auto-suggestions based on client data</p>
                  <p className="text-sm">• Performance optimizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technical Implementation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Key Files to Create/Modify:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <h5 className="font-medium">New Components:</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• src/components/exercise/ExerciseBrowser.tsx</li>
                      <li>• src/components/exercise/ExerciseCard.tsx</li>
                      <li>• src/components/exercise/ExerciseFilters.tsx</li>
                      <li>• src/components/exercise/ExerciseSearch.tsx</li>
                      <li>• src/components/template/MultiStepTemplateCreator.tsx</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">Modified Files:</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• src/components/admin/EnhancedProgramCreator.tsx</li>
                      <li>• src/pages/admin/TemplateDetail.tsx</li>
                      <li>• src/hooks/useAccess.ts (add TT Beta access)</li>
                      <li>• src/components/Header.tsx (add TT Beta menu)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Database Migrations:</h4>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-mono">supabase/migrations/YYYYMMDD_enhance_exercises_table.sql</p>
                  <p className="text-sm font-mono">supabase/migrations/YYYYMMDD_add_exercise_analytics.sql</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">API Endpoints:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium">Exercise Library:</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• GET /api/exercises/search</li>
                      <li>• GET /api/exercises/filters</li>
                      <li>• POST /api/exercises/usage</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium">Template Creation:</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• POST /api/templates/multi-step</li>
                      <li>• GET /api/templates/weight-recommendations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-2xl text-primary">2-3 min</h4>
                  <p className="text-sm text-muted-foreground">Template creation time</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-2xl text-primary">80%</h4>
                  <p className="text-sm text-muted-foreground">Reduction in manual typing</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold text-2xl text-primary">95%</h4>
                  <p className="text-sm text-muted-foreground">Exercise consistency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        <p>TT Beta - Next-generation exercise system for TreeniTaastu</p>
        <p className="mt-1">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

