import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Users
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);
  const [loading, setLoading] = useState(true);
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
        .select('*')
        .order('created_at');

      if (programsError) {
        console.log('Programs table not found, using fallback data');
        // Fallback data if tables don't exist yet
        const fallbackPrograms: Program[] = [
          {
            id: 'kontorikeha-reset',
            title: 'Kontorikeha Reset',
            description: '20-päevane programm kontoritöötajatele, mis aitab parandada kehahoiakut ja vähendada põhja- ja kaelavalusid. Sisaldab lihtsaid harjutusi, mida saab teha kodus või kontoris.',
            duration_days: 20,
            difficulty: 'alustaja',
            status: 'available',
            created_at: new Date().toISOString()
          },
          {
            id: '35-naised-kodus',
            title: '35+ Naised Kodus Tugevaks',
            description: 'Spetsiaalselt 35+ naistele mõeldud tugevustreeningu programm, mida saab teha kodus. Fookus lihaste tugevdamisel ja luutiheduse säilitamisel.',
            duration_days: 28,
            difficulty: 'keskmine',
            status: 'coming_soon',
            created_at: new Date().toISOString()
          },
          {
            id: 'alaseljavalu-lahendus',
            title: 'Alaseljavalu Lahendus',
            description: 'Keskendub alaselja tugevdamisele ja valude vähendamisele. Sisaldab spetsiaalseid harjutusi, mis aitavad parandada selja tervist ja vähendada kroonilisi valusid.',
            duration_days: 21,
            difficulty: 'alustaja',
            status: 'coming_soon',
            created_at: new Date().toISOString()
          }
        ];
        setPrograms(fallbackPrograms);
        setUserPrograms([]);
        return;
      }

      // Load user programs
      const { data: userProgramsData, error: userProgramsError } = await supabase
        .from('user_programs')
        .select('*')
        .eq('user_id', user?.id);

      if (userProgramsError) {
        console.log('User programs table not found, using empty array');
        setUserPrograms([]);
      } else {
        setUserPrograms(userProgramsData || []);
      }

      setPrograms(programsData || []);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('Programmide laadimine ebaõnnestus');
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
    try {
      // For "Kontorikeha Reset" program, redirect directly to /programm
      if (programId === 'kontorikeha-reset') {
        toast.success('Programm alustatud!');
        setSelectedProgram(null);
        window.location.href = '/programm';
        return;
      }

      // Try to use the database function
      const { data, error } = await supabase.rpc('start_program', {
        p_user_id: user?.id,
        p_program_id: programId
      });

      if (error) {
        console.log('Database function not available, using fallback');
        // Fallback: just redirect to programm page
        toast.success('Programm alustatud!');
        setSelectedProgram(null);
        window.location.href = '/programm';
        return;
      }

      if (data?.success) {
        toast.success('Programm alustatud!');
        await loadData();
        setSelectedProgram(null);
        window.location.href = '/programm';
      }
    } catch (error) {
      console.error('Error starting program:', error);
      toast.error('Programmi alustamine ebaõnnestus');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Laen programme...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Treeningprogrammid
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Vali oma treeningprogramm ja alusta teekonda tervislikumaks eluks
          </p>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => {
            const status = getProgramStatus(program);
            const isAvailable = status === 'available' || status === 'active' || status === 'paused';
            
            return (
              <Card 
                key={program.id} 
                className={`bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg transition-all duration-200 hover:shadow-xl ${
                  status === 'completed' ? 'ring-2 ring-yellow-200' : ''
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-gray-900 mb-2">
                        {program.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getDifficultyColor(program.difficulty)}>
                          {getDifficultyText(program.difficulty)}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {program.duration_days} päeva
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="text-sm font-medium text-gray-700">
                        {getStatusText(status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <CardDescription className="text-gray-600 line-clamp-3">
                    {program.description}
                  </CardDescription>

                  <div className="flex gap-2">
                    {status === 'available' && (
                      <Button 
                        onClick={() => handleStartProgram(program.id)}
                        className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-200 text-gray-900"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Alusta
                      </Button>
                    )}

                    {status === 'active' && (
                      <Button 
                        asChild
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Link to="/programm">
                          <Play className="h-4 w-4 mr-2" />
                          Jätka
                        </Link>
                      </Button>
                    )}

                    {status === 'paused' && (
                      <Button 
                        onClick={() => handleStartProgram(program.id)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Jätka
                      </Button>
                    )}

                    {status === 'completed' && (
                      <div className="flex-1 flex items-center justify-center gap-2 text-yellow-600 font-medium">
                        <Star className="h-4 w-4" />
                        Lõpetatud!
                      </div>
                    )}

                    {status === 'coming_soon' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            className="flex-1 border-gray-300 hover:bg-gray-50"
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

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="px-3"
                        >
                          <ArrowRight className="h-4 w-4" />
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
                          {isAvailable && (
                            <Button 
                              onClick={() => handleStartProgram(program.id)}
                              className="w-full"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Alusta programm
                            </Button>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-12 text-center">
          <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30 p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Rohkem programme tulekul
            </h3>
            <p className="text-gray-600">
              Töötame pidevalt uute treeningprogrammide kallal, 
              mis aitavad sul saavutada oma tervise- ja fitnesseesmärke.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Programmid;
