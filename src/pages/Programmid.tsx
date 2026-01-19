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
      const convertedPrograms: Program[] = (programsData || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        duration_days: (p.duration_weeks || 4) * 7, // Convert weeks to days
        difficulty: 'alustaja' as const, // Default, can be enhanced later
        status: 'available' as const, // Default, can be enhanced later
        created_at: p.created_at || new Date().toISOString()
      }));

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

  const getProgramStatus = (program: Program) => {
    const userProgram = userPrograms.find(up => up.program_id === program.id);
    
    if (userProgram?.status === 'completed') return 'completed';
    if (userProgram?.status === 'active') return 'active';
    if (userProgram?.status === 'paused') return 'paused';
    if (program.status === 'available') return 'available';
    return 'coming_soon';
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
      default:
        return <Lock className="h-5 w-5 text-gray-400" />;
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
      default:
        return 'Tulekul';
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
          toast.error('Programm ei leitud');
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
      const errorMessage = error?.message || 'Programmi alustamine ebaõnnestus';
      toast.error(errorMessage);
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Target className="h-6 w-6 text-purple-500 animate-pulse" />
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header - Beautiful Design */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-6 shadow-xl">
            <Target className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Treeningprogrammid
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Vali oma treeningprogramm ja alusta teekonda tervislikumaks eluks
          </p>
        </div>

        {/* Programs Grid */}
        {programs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200/50 to-purple-200/50 rounded-full blur-xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-full p-8 w-28 h-28 flex items-center justify-center border-2 border-gray-200/50 shadow-xl">
                  <Calendar className="h-14 w-14 text-gray-400" />
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
            const isAvailable = status === 'available' || status === 'active' || status === 'paused';
            
            return (
              <Card 
                key={program.id} 
                className={`group relative overflow-hidden bg-white/80 backdrop-blur-sm border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  status === 'completed' 
                    ? 'border-yellow-300 ring-2 ring-yellow-200/50' 
                    : status === 'active'
                    ? 'border-green-300 ring-2 ring-green-200/50'
                    : status === 'paused'
                    ? 'border-orange-300 ring-2 ring-orange-200/50'
                    : 'border-gray-200/50 hover:border-blue-300'
                }`}
              >
                <div className={`absolute inset-0 transition-all duration-300 ${
                  status === 'completed' 
                    ? 'bg-gradient-to-br from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/5 group-hover:to-yellow-500/5'
                    : status === 'active'
                    ? 'bg-gradient-to-br from-green-500/0 to-green-500/0 group-hover:from-green-500/5 group-hover:to-green-500/5'
                    : 'bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5'
                }`}></div>
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2 pr-2">
                        {program.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={`${getDifficultyColor(program.difficulty)} border`}>
                          {getDifficultyText(program.difficulty)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">{program.duration_days} päeva</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(status)}
                      <Badge 
                        className={`text-xs font-semibold ${
                          status === 'active' ? 'bg-green-500 text-white border-0' :
                          status === 'paused' ? 'bg-orange-500 text-white border-0' :
                          status === 'completed' ? 'bg-yellow-500 text-white border-0' :
                          'bg-blue-100 text-blue-700 border-blue-300'
                        }`}
                      >
                        {getStatusText(status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <CardDescription className="text-gray-600 line-clamp-3">
                    {program.description}
                  </CardDescription>

                  <div className="space-y-2">
                    {status === 'available' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="relative w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
                            <Button 
                              onClick={() => {
                                setSelectedProgram(null);
                                handleStartProgram(program.id);
                              }}
                              className="w-full"
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
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all"
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
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-md hover:shadow-lg transition-all"
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
                              Saad alustada seda programmi pärast praeguse programmi lõpetamist, 
                              tasuta tellijatele.
                            </p>
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1">
                                Osta kohe juurdepääs
                              </Button>
                              <Button variant="ghost" className="flex-1">
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
          <div className="mt-12 text-center">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 backdrop-blur-sm rounded-xl border-2 border-blue-200/50 p-8 max-w-2xl mx-auto shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Rohkem programme tulekul
                </h3>
                <p className="text-gray-600">
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
