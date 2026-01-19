import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Target, 
  Clock, 
  Star, 
  CheckCircle, 
  Play, 
  Lock,
  ArrowRight,
  Calendar,
  Users,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import useAccess from '@/hooks/useAccess';

interface Program {
  id: string;
  title: string;
  description: string;
  duration_days: number;
  difficulty: 'alustaja' | 'keskmine' | 'kogenud';
  status: 'available' | 'coming_soon' | 'maintenance';
  created_at: string;
}

interface UserProgram {
  id: string;
  program_id: string;
  status: 'active' | 'completed' | 'paused';
  started_at: string;
  completed_at?: string;
}

const Programmid: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, canStatic, loading: accessLoading } = useAccess();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingProgram, setStartingProgram] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load programs from database
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, title, description, duration_weeks, created_at')
        .order('created_at');

      if (programsError) {
        console.error('Error loading programs:', programsError);
            toast({ title: 'Viga', description: 'Programmide laadimine ebaõnnestus', variant: 'destructive' });
        setPrograms([]);
        setUserPrograms([]);
        return;
      }

      // Convert programs data: duration_weeks -> duration_days
      const convertedPrograms: Program[] = (programsData || []).map(p => {
        // Calculate duration_days from duration_weeks (default to 4 weeks if missing)
        const weeks = p.duration_weeks || 4;
        const days = weeks * 7;
        
        return {
          id: p.id,
          title: p.title,
          description: p.description || '',
          duration_days: days, // Convert weeks to days
          difficulty: 'alustaja' as const, // Default, can be enhanced later
          status: 'available' as const, // Default, can be enhanced later
          created_at: p.created_at || new Date().toISOString()
        };
      });

      // Load user programs
      const { data: userProgramsData, error: userProgramsError } = await supabase
        .from('user_programs')
        .select('*')
        .eq('user_id', user?.id);

      if (userProgramsError) {
        console.error('Error loading user programs:', userProgramsError);
        // Continue with empty array - not critical
        setUserPrograms([]);
      } else {
        setUserPrograms(userProgramsData || []);
      }

      setPrograms(convertedPrograms);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast({ title: 'Viga', description: 'Programmide laadimine ebaõnnestus. Palun proovi hiljem uuesti.', variant: 'destructive' });
      setPrograms([]);
      setUserPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const getProgramStatus = (program: Program): 'completed' | 'active' | 'paused' | 'available' | 'coming_soon' | 'needs_subscription' => {
    const userProgram = userPrograms.find(up => up.program_id === program.id);
    
    // Check user-specific program status first
    if (userProgram?.status === 'completed') return 'completed';
    if (userProgram?.status === 'active') return 'active';
    if (userProgram?.status === 'paused') return 'paused';
    
    // Admin has full access to all programs - bypass all restrictions
    if (isAdmin) {
      // Admins can access all programs, even if marked as coming_soon
      return 'available';
    }
    
    // For non-admins, check static program access
    // Static access requires monthly subscription (self_guided/guided), trial, or transformation
    // One-time PT purchases do NOT grant static access
    if (program.status === 'available') {
      // Program is available - check if user has static access
      if (canStatic) {
        // User has monthly subscription, trial, or transformation
        return 'available';
      } else {
        // User needs monthly subscription to access static programs
        // One-time PT purchase does not grant static access
        return 'needs_subscription';
      }
    }
    
    // Program is actually coming soon (not available yet)
    if (program.status === 'coming_soon') {
      return 'coming_soon';
    }
    
    // Default: treat as available if program exists and user has static access
    return program.status === 'available' ? (canStatic ? 'available' : 'needs_subscription') : 'coming_soon';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'active':
        return <Play className="h-5 w-5 text-green-500" />;
      case 'paused':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'available':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'needs_subscription':
        return <Lock className="h-5 w-5 text-blue-500" />;
      case 'coming_soon':
        return <Lock className="h-5 w-5 text-gray-400" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Lõpetatud';
      case 'active':
        return 'Aktiivne';
      case 'paused':
        return 'Peatatud';
      case 'available':
        return 'Saadaval';
      case 'needs_subscription':
        return 'Vajab tellimust';
      case 'coming_soon':
        return 'Tulekul';
      default:
        return 'Saadaval';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'alustaja':
        return 'bg-green-100 text-green-800';
      case 'keskmine':
        return 'bg-yellow-100 text-yellow-800';
      case 'kogenud':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'alustaja':
        return 'Alustaja';
      case 'keskmine':
        return 'Keskmine';
      case 'kogenud':
        return 'Kogenud';
      default:
        return 'Teadmata';
    }
  };

  const handleStartProgram = async (programId: string) => {
    if (!user) return;
    
    setStartingProgram(programId);
    try {
      // Check if program exists in programs table
      let actualProgramId = programId;
      const { data: programData } = await supabase
        .from('programs')
        .select('id')
        .eq('id', programId)
        .single();

      if (!programData) {
        // Fallback for legacy string IDs
        if (programId === 'kontorikeha-reset') {
          const { data: krProgram } = await supabase
            .from('programs')
            .select('id')
            .eq('title', 'Kontorikeha Reset')
            .single();
          
          if (krProgram) {
            actualProgramId = krProgram.id;
          } else {
            toast({ title: 'Viga', description: 'Programm ei leitud', variant: 'destructive' });
            return;
          }
        } else {
            toast({ title: 'Viga', description: 'Programm ei leitud', variant: 'destructive' });
          return;
        }
      } else {
        actualProgramId = programId;
      }

      // Check if user already has this program (paused or active)
      const existingProgram = userPrograms.find(up => up.program_id === actualProgramId);
      
      if (existingProgram?.status === 'paused') {
        // Resume paused program - set any other active programs to paused first (only one active at a time)
        const { error: pauseOthersError } = await supabase
          .from('user_programs')
          .update({ 
            status: 'paused',
            paused_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'active');

        // Resume this program
        const { error: resumeError } = await supabase
          .from('user_programs')
          .update({ 
            status: 'active',
            paused_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('program_id', actualProgramId);

        if (resumeError) {
          throw resumeError;
        }

        // For static programs, also ensure static_starts is set
        if (actualProgramId === 'e1ab6f77-5a43-4c05-ac0d-02101b499e4c') {
          await supabase.rpc('start_static_program', { p_force: false });
        }

        toast({ title: 'Õnnestus!', description: 'Programm jätkatud!' });
      } else {
        // Start new program - pause any active programs first
        const { error: pauseError } = await supabase
          .from('user_programs')
          .update({ 
            status: 'paused',
            paused_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'active');

        // Create or update user_programs entry
        const { error: upsertError } = await supabase
          .from('user_programs')
          .upsert({
            user_id: user.id,
            program_id: actualProgramId,
            status: 'active',
            started_at: existingProgram?.started_at || new Date().toISOString(),
            paused_at: null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,program_id'
          });

        if (upsertError) {
          throw upsertError;
        }

        // For static programs, also call start_static_program
        if (actualProgramId === 'e1ab6f77-5a43-4c05-ac0d-02101b499e4c') {
          await supabase.rpc('start_static_program', { p_force: false });
        }

        toast({ title: 'Õnnestus!', description: 'Programm alustatud!' });
      }

      await loadData();
      setSelectedProgram(null);
      
      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        navigate('/programm');
      }, 100);
    } catch (error: any) {
      console.error('Error starting program:', error);
      const errorMessage = error?.message || 'Programmi alustamine ebaõnnestus. Palun proovi hiljem uuesti.';
      toast({ title: 'Viga', description: errorMessage, variant: 'destructive' });
      
      // Try to reload data to get current state
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Error reloading data:', reloadError);
      }
    } finally {
      setStartingProgram(null);
    }
  };

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-[#00B6E5] mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#009BC7] animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 mb-1">Laen programme...</p>
            <p className="text-sm text-gray-500">Palun oota hetke</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        {/* Header - Clean Design */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#00B6E5] rounded-full mb-4 sm:mb-6 shadow-lg">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Treeningprogrammid
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Vali oma treeningprogramm ja alusta teekonda tervislikumaks eluks
          </p>
        </div>

        {/* Programs Grid */}
        {programs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="relative bg-white rounded-full p-6 sm:p-8 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center border-2 border-gray-200 shadow-lg">
                  <Calendar className="h-12 w-12 sm:h-14 sm:w-14 text-gray-400" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Programme pole saadaval
              </h2>
              <p className="text-gray-600 mb-2">
                Praegu pole sinu jaoks programme saadaval.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Palun kontrolli hiljem uuesti või võta ühendust toega.
              </p>
              <Button asChild variant="outline" className="gap-2 border-2 border-gray-300 hover:bg-gray-50">
                <Link to="/home">
                  <ArrowLeft className="h-4 w-4" />
                  Tagasi avalehele
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => {
            const status = getProgramStatus(program);
            // Admins and users with subscription can access available programs
            const canAccess = isAdmin || canStatic || status === 'active' || status === 'paused' || status === 'completed';
            const isAvailable = status === 'available' || status === 'active' || status === 'paused';
            
            return (
              <Card 
                key={program.id} 
                className={`group relative overflow-hidden bg-white border transition-all duration-300 hover:shadow-lg ${
                  status === 'completed' 
                    ? 'border-yellow-300' 
                    : status === 'active'
                    ? 'border-green-300'
                    : status === 'paused'
                    ? 'border-orange-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CardHeader className="relative pb-3 sm:pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 pr-2">
                        {program.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Badge className={`${getDifficultyColor(program.difficulty)} text-xs sm:text-sm`}>
                          {getDifficultyText(program.difficulty)}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="font-medium whitespace-nowrap">{program.duration_days || 28} päeva</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      {getStatusIcon(status)}
                      <Badge 
                        className={`text-xs font-semibold whitespace-nowrap ${
                          status === 'active' ? 'bg-green-500 text-white border-0' :
                          status === 'paused' ? 'bg-orange-500 text-white border-0' :
                          status === 'completed' ? 'bg-yellow-500 text-white border-0' :
                          status === 'needs_subscription' ? 'bg-[#00B6E5] text-white border-0' :
                          status === 'coming_soon' ? 'bg-gray-400 text-white border-0' :
                          'bg-blue-100 text-blue-700 border-blue-300'
                        }`}
                      >
                        {getStatusText(status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 sm:space-y-4">
                  <CardDescription className="text-sm sm:text-base text-gray-600 line-clamp-3">
                    {program.description}
                  </CardDescription>

                  <div className="space-y-2">
                    {/* Available - User can start this program */}
                    {(status === 'available' || (status === 'coming_soon' && isAdmin)) && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="relative w-full bg-[#00B6E5] hover:bg-[#009BC7] text-white shadow-md hover:shadow-lg transition-all duration-200"
                            disabled={startingProgram === program.id}
                          >
                            {startingProgram === program.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Alustan...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Alusta programm
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{program.title}</DialogTitle>
                            <DialogDescription>
                              Programmi üksikasjad
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{program.duration_days} päeva</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span>{getDifficultyText(program.difficulty)}</span>
                              </div>
                            </div>
                            <p className="text-gray-600">{program.description}</p>
                            {isAdmin && status === 'coming_soon' && (
                              <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                                ⚠️ Admin: See programm on andmebaasis märgitud kui "coming_soon", kuid sul on ligipääs.
                              </p>
                            )}
                            <Button 
                              onClick={() => {
                                setSelectedProgram(null);
                                handleStartProgram(program.id);
                              }}
                              className="w-full bg-[#00B6E5] hover:bg-[#009BC7] text-white"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Alusta programm
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {status === 'active' && (
                      <Button 
                        asChild
                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Link to="/programm">
                          <Play className="h-4 w-4 mr-2" />
                          Jätka programm
                        </Link>
                      </Button>
                    )}

                    {status === 'paused' && (
                      <Button 
                        onClick={() => handleStartProgram(program.id)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
                        disabled={startingProgram === program.id}
                      >
                        {startingProgram === program.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Jätkan...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Jätka programm
                          </>
                        )}
                      </Button>
                    )}

                    {status === 'completed' && (
                      <div className="w-full flex items-center justify-center gap-2 text-yellow-600 font-medium py-2">
                        <Star className="h-4 w-4" />
                        Lõpetatud!
                      </div>
                    )}

                    {/* Needs Subscription - Program is available but user needs monthly subscription */}
                    {status === 'needs_subscription' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            className="w-full border-blue-300 hover:bg-blue-50"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Vajab tellimust
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{program.title}</DialogTitle>
                            <DialogDescription>
                              Programm on saadaval kuutasustellimusele
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{program.duration_days} päeva</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span>{getDifficultyText(program.difficulty)}</span>
                              </div>
                            </div>
                            <p className="text-gray-600">{program.description}</p>
                            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                              Selle programmi kasutamiseks on vaja kuutasustellimust (Iseseisev treening või Juhendatud treening). Tellimuse eest saad ligipääsu kõikidele staatilistele programmidele.
                            </p>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => navigate('/pricing')}
                                className="flex-1 bg-[#00B6E5] hover:bg-[#009BC7] text-white"
                              >
                                Vaata hindu
                              </Button>
                              <Button 
                                variant="ghost" 
                                onClick={() => setSelectedProgram(null)}
                                className="flex-1"
                              >
                                Sulge
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Coming Soon - Program is actually in development */}
                    {status === 'coming_soon' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            className="w-full border-gray-300 hover:bg-gray-50"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Tulekul
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{program.title}</DialogTitle>
                            <DialogDescription>
                              See programm on veel arendamisel
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>{program.duration_days} päeva</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span>{getDifficultyText(program.difficulty)}</span>
                              </div>
                            </div>
                            <p className="text-gray-600">{program.description}</p>
                            <p className="text-sm text-gray-600">
                              See programm on praegu arendamisel ja saab peagi kättesaadavaks. Jälgi värskendusi!
                            </p>
                            {isAdmin && (
                              <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg font-medium">
                                ⚠️ Admin: See programm on märgitud kui "coming_soon" andmebaasis. Vajadusel saad seda muuta.
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                onClick={() => setSelectedProgram(null)}
                                className="w-full"
                              >
                                Sulge
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}

        {/* Coming Soon Notice - Only show if there are programs */}
        {programs.length > 0 && (
          <div className="mt-8 sm:mt-12 text-center px-4">
            <div className="relative overflow-hidden bg-white rounded-lg border border-gray-200 p-6 sm:p-8 max-w-2xl mx-auto shadow-sm">
              <div className="relative">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#00B6E5] rounded-full mb-3 sm:mb-4">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  Rohkem programme tulekul
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Töötame pidevalt uute treeningprogrammide kallal, 
                  mis aitavad sul saavutada oma tervise- ja fitnesseesmärke.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Programmid;
