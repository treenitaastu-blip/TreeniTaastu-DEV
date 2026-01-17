import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWeekendRedirect } from '@/hooks/useWeekendRedirect';

// Exercise configuration types
interface BreathingPhase {
  name: string;
  duration: number; // in seconds
  instruction: string;
}

interface BreathingExercise {
  id: string;
  name: string;
  category: string;
  description: string;
  totalDuration: number;
  phases: BreathingPhase[];
  instruction: string;
  breathingMethod: 'nose' | 'mouth';
  color: string;
  icon: string;
}

// Exercise configurations
const breathingExercises: BreathingExercise[] = [
  {
    id: "aktiveeriv",
    name: "Aktiveeriv hingamine",
    category: "Energiat ja keskendumist tõstev",
    description: "Kiire ja jõuline hingamine nina kaudu, mis ergutab närvisüsteemi ja tõstab hapnikutaset. Parim hommikul või enne treeningut.",
    totalDuration: 60, // 1 minute
    phases: [
      { name: "Sisse", duration: 1, instruction: "Hinga kiiresti sisse" },
      { name: "Välja", duration: 1, instruction: "Hinga kiiresti välja" }
    ],
    instruction: "Hinga kiiresti ja jõuliselt sisse ning välja läbi suu. Hoia tempo ühtlane, umbes kord sekundis. Pärast 30 hingetõmmet lõdvestu ja hinga sügavalt välja.",
    breathingMethod: 'mouth',
    color: "from-orange-400 to-red-500",
    icon: "▲"
  },
  {
    id: "ruuthingamine",
    name: "Ruuthingamine",
    category: "Stressi ja ärevuse leevendamiseks",
    description: "Rahustav hingamisrütm, mida kasutavad ka sportlased ja sõjaväelased ärevuse kontrolliks.",
    totalDuration: 180, // 3 minutes
    phases: [
      { name: "Sisse", duration: 4, instruction: "Hinga sügavalt sisse" },
      { name: "Hoia", duration: 4, instruction: "Hoia hinge kinni" },
      { name: "Välja", duration: 4, instruction: "Hinga aeglaselt välja" },
      { name: "Hoia", duration: 4, instruction: "Hoia jälle kinni" }
    ],
    instruction: "Hinga sügavalt sisse 4 sekundi jooksul läbi nina, hoia hinge kinni 4 sekundit, hinga välja 4 sekundi jooksul ja hoia jälle 4 sekundit. Korda kuus tsüklit. Kujuta ette, et liigud mööda nelinurka.",
    breathingMethod: 'nose',
    color: "from-blue-400 to-indigo-500",
    icon: "⬜"
  },
  {
    id: "478",
    name: "4-7-8 hingamine",
    category: "Uinumise ja taastumise soodustamiseks",
    description: "Aitab aeglustada pulssi ja aktiveerib parasümpaatilist närvisüsteemi.",
    totalDuration: 180, // 3 minutes
    phases: [
      { name: "Sisse", duration: 4, instruction: "Hinga sügavalt sisse" },
      { name: "Hoia", duration: 7, instruction: "Hoia hinge kinni" },
      { name: "Välja", duration: 8, instruction: "Hinga aeglaselt välja" }
    ],
    instruction: "Hinga sisse 4 sekundi jooksul läbi nina, hoia hinge kinni 7 sekundit ja hinga aeglaselt välja 8 sekundi jooksul. Korda neli korda. Ideaalne enne und või lõõgastuseks.",
    breathingMethod: 'nose',
    color: "from-purple-400 to-pink-500",
    icon: "●"
  },
  {
    id: "tasakaalustatud",
    name: "Tasakaalustatud hingamine",
    category: "Närvisüsteemi tasakaalustamiseks ja keskendumise taastamiseks",
    description: "Rahustav ja rütmiline hingamisviis, mis aitab stabiliseerida pulssi ja närvisüsteemi aktiivsust. Sobib ideaalselt tööpausi, keskendumise taastamise või päeva alustamise ajaks.",
    totalDuration: 300, // 5 minutes
    phases: [
      { name: "Sisse", duration: 5, instruction: "Hinga sügavalt sisse" },
      { name: "Välja", duration: 5, instruction: "Hinga aeglaselt välja" }
    ],
    instruction: "Hinga sügavalt sisse 5 sekundi jooksul läbi nina ja hinga sama aeglaselt välja 5 sekundi jooksul. Hoia rütm ühtlane ja keskendu hingamise tundele rinnus.",
    breathingMethod: 'nose',
    color: "from-green-400 to-teal-500",
    icon: "◯"
  }
];

export default function MindfulnessPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { markWeekendCompleted } = useWeekendRedirect();
  
  // Exercise selection state
  const [selectedExercise, setSelectedExercise] = useState<BreathingExercise | null>(null);
  const [showExerciseSelection, setShowExerciseSelection] = useState(true);
  
  // Exercise execution state
  const [isActive, setIsActive] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phase, setPhase] = useState<'prep' | 'inhale' | 'exhale' | 'hold'>('prep');
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5000); // 5 seconds in ms
  const [prepBreaths, setPrepBreaths] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  
  // Check if coming from calendar
  const fromCalendar = location.state?.fromCalendar;
  const dayNumber = location.state?.dayNumber;
  const returnPath = location.state?.returnPath || '/programm';

  // Calculate cycles based on selected exercise - Bug #2 fix: useMemo to recalculate when selectedExercise changes
  const totalCycles = useMemo(() => {
    if (!selectedExercise) return 10;
    
    switch (selectedExercise.id) {
      case 'aktiveeriv':
        return 30; // 30 breaths in 1 minute
      case 'ruuthingamine':
        return 6; // 6 cycles in 3 minutes
      case '478':
        return 4; // 4 cycles in 3 minutes
      case 'tasakaalustatud':
        return 30; // 30 cycles in 5 minutes
      default:
        return 10;
    }
  }, [selectedExercise]);
  
  const prepPhases = 3; // 3 preparation breaths
  
  // Get current phase duration based on selected exercise - Bug #1 fix: calculate dynamically
  const getCurrentPhaseDuration = useCallback(() => {
    if (!selectedExercise) return 5000; // Default 5 seconds
    
    if (phase === 'prep') {
      return 5000; // Fixed 5 seconds for preparation phase
    }
    
    // For main exercise, use the current phase
    const phaseIndex = currentPhase % selectedExercise.phases.length;
    return selectedExercise.phases[phaseIndex].duration * 1000;
  }, [selectedExercise, phase, currentPhase]);

  const getExerciseSpecificMessage = () => {
    if (!selectedExercise) return "Suurepärane! Sa andsid endale kingi - hetke täielikku rahu.";
    
    switch (selectedExercise.id) {
      case 'aktiveeriv':
        return "Suurepärane! Sa ergutasid oma närvisüsteemi ja tõstsid energiataset. Tunne seda energiat kogu päeva jooksul.";
      case 'ruuthingamine':
        return "Hästi tehtud! Sa leevendasid stressi ja taastasid sisemise tasakaalu. Tunne seda rahu.";
      case '478':
        return "Suurepärane! Sa valmistasid keha ja meele und. Lõdvestu ja lase kehal taastuda.";
      case 'tasakaalustatud':
        return "Hästi tehtud! Sa tasakaalustasid närvisüsteemi ja taastasid keskendumise. Tunne seda selgust.";
      default:
        return "Suurepärane! Sa andsid endale kingi - hetke täielikku rahu.";
    }
  };

  // Audio context for breathing sounds
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioSupported, setAudioSupported] = useState(true);
  const [iosAudioUnlocked, setIosAudioUnlocked] = useState(false);
  
  // Track active audio sources to prevent overlapping sounds
  const activeAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Stop all active sounds - useCallback to ensure stable reference
  const stopAllSounds = useCallback(() => {
    activeAudioSourcesRef.current.forEach(source => {
      try {
        if (source.buffer) {
          source.stop();
        }
      } catch (error) {
        // Source might already be stopped, ignore
        console.log('[Mindfulness] Sound already stopped');
      }
    });
    activeAudioSourcesRef.current.clear();
  }, []);
  
  // Bug #5 fix: Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => {
          console.warn('[Mindfulness] Error closing audio context:', err);
        });
        audioContextRef.current = null;
      }
    };
  }, []);

  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const initializeAudioContext = async () => {
    try {
      console.log('[Mindfulness] Initializing audio context...');
      console.log('[Mindfulness] User agent:', navigator.userAgent);
      console.log('[Mindfulness] Is iOS:', isIOS());
      
      if (!audioContextRef.current) {
        // Use webkit prefix for iOS compatibility
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.error('[Mindfulness] Web Audio API not supported');
          setAudioSupported(false);
          return false;
        }
        
        audioContextRef.current = new AudioContextClass({
          sampleRate: 44100, // Use standard sample rate for better iOS compatibility
          latencyHint: 'interactive'
        });
        
        console.log('[Mindfulness] Audio context created:', audioContextRef.current.state);
      }
      
      // For iOS, we need to unlock audio context with user interaction
      if (audioContextRef.current.state === 'suspended') {
        console.log('[Mindfulness] Resuming suspended audio context...');
        await audioContextRef.current.resume();
        
        // iOS-specific audio unlocking
        if (isIOS() && !iosAudioUnlocked) {
          await unlockIOSAudio();
        }
      }
      
      console.log('[Mindfulness] Audio context state:', audioContextRef.current.state);
      return audioContextRef.current.state === 'running';
    } catch (error) {
      console.error('[Mindfulness] Audio context initialization failed:', error);
      setAudioSupported(false);
      return false;
    }
  };

  const unlockIOSAudio = async () => {
    if (!audioContextRef.current || iosAudioUnlocked) return;
    
    try {
      console.log('[Mindfulness] Unlocking iOS audio...');
      
      // Create a short silent buffer to unlock audio
      const buffer = audioContextRef.current.createBuffer(1, 1, audioContextRef.current.sampleRate);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      
      // Wait a moment for iOS to unlock
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIosAudioUnlocked(true);
      console.log('[Mindfulness] iOS audio unlocked successfully');
    } catch (error) {
      console.error('[Mindfulness] Failed to unlock iOS audio:', error);
    }
  };

  const createBreathSound = async (type: 'inhale' | 'exhale', duration?: number) => {
    try {
      if (!audioSupported) {
        console.log('[Mindfulness] Audio not supported, skipping sound generation');
        return;
      }

      // Stop all previous sounds before creating a new one to prevent overlapping
      stopAllSounds();

      const initialized = await initializeAudioContext();
      if (!initialized || !audioContextRef.current || audioContextRef.current.state !== 'running') {
        console.warn('[Mindfulness] Audio context not available, state:', audioContextRef.current?.state);
        return;
      }

      console.log(`[Mindfulness] Creating ${type} sound`);
      
      const audioContext = audioContextRef.current;
      const soundDuration = duration || (type === 'inhale' ? 4.5 : 5.5);
      
      // Use current time immediately to ensure proper timing
      const now = audioContext.currentTime;
      
      // Create noise source with iOS-optimized settings
      const bufferSize = Math.floor(audioContext.sampleRate * soundDuration);
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      console.log(`[Mindfulness] Buffer size: ${bufferSize}, Sample rate: ${audioContext.sampleRate}`);
      
      // Generate pink noise (more natural than white noise)
      // Simplified version for better iOS compatibility
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.2; // Increase volume for mobile devices
        b6 = white * 0.115926;
      }
      
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      
      // Create filter for wind-like sound with iOS-compatible settings
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      const baseFreq = type === 'inhale' ? 300 : 200;
      filter.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
      filter.Q.setValueAtTime(0.7, audioContext.currentTime); // Slightly higher Q for more defined sound
      
      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      
      // Connect audio nodes
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set gain envelope to simulate breathing with iOS-optimized values
      gainNode.gain.setValueAtTime(0, now);
      
      const maxGain = isIOS() ? 0.25 : 0.15; // Higher volume on iOS
      
      if (type === 'inhale') {
        // Gradual increase for inhale (wind coming in)
        gainNode.gain.linearRampToValueAtTime(maxGain, now + 0.5);
        gainNode.gain.setValueAtTime(maxGain, now + soundDuration - 0.8);
        gainNode.gain.linearRampToValueAtTime(0, now + soundDuration);
        
        // Frequency modulation for inhale
        filter.frequency.setValueAtTime(baseFreq, now);
        filter.frequency.linearRampToValueAtTime(baseFreq + 100, now + soundDuration * 0.3);
        filter.frequency.linearRampToValueAtTime(baseFreq + 50, now + soundDuration);
      } else {
        // Gradual decrease for exhale (wind going out)
        gainNode.gain.linearRampToValueAtTime(maxGain * 0.8, now + 0.3);
        gainNode.gain.setValueAtTime(maxGain * 0.8, now + soundDuration - 1.2);
        gainNode.gain.linearRampToValueAtTime(0, now + soundDuration);
        
        // Frequency modulation for exhale
        filter.frequency.setValueAtTime(baseFreq, now);
        filter.frequency.linearRampToValueAtTime(baseFreq - 50, now + soundDuration * 0.7);
        filter.frequency.linearRampToValueAtTime(baseFreq - 100, now + soundDuration);
      }
      
      // Add error handling for audio playback and cleanup
      noiseSource.onended = () => {
        console.log(`[Mindfulness] ${type} sound ended`);
        activeAudioSourcesRef.current.delete(noiseSource);
      };
      
      // Track this source
      activeAudioSourcesRef.current.add(noiseSource);
      
      // Start the sound immediately (no delay to prevent timing issues)
      noiseSource.start(now);
      noiseSource.stop(now + soundDuration);
      
      console.log(`[Mindfulness] ${type} sound started at ${now}, duration: ${soundDuration}s`);
    } catch (error) {
      console.error(`[Mindfulness] Error creating ${type} sound:`, error);
      console.error('[Mindfulness] Audio context state:', audioContextRef.current?.state);
      console.error('[Mindfulness] Audio supported:', audioSupported);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && !isCompleted && selectedExercise) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 100) {
            if (phase === 'prep') {
              // Handle preparation phase
              setPrepBreaths((prevBreaths) => {
                const nextBreaths = prevBreaths + 1;
                if (nextBreaths >= prepPhases * 2) {
                  // Finished prep, start main exercise
                  setPhase('inhale');
                  setCurrentPhase(0);
                  const prepDuration = 5; // 5 seconds for preparation
                  createBreathSound('inhale', prepDuration);
                  return 0;
                } else {
                  // Continue prep phase
                  const nextPhase = nextBreaths % 2 === 1 ? 'exhale' : 'inhale';
                  const prepDuration = 5; // 5 seconds for preparation
                  createBreathSound(nextPhase, prepDuration);
                  setPhase('prep');
                  return nextBreaths;
                }
              });
            } else {
              // Handle main exercise phase with selected exercise phases
              // Bug #3 fix: Calculate next phase duration BEFORE updating state
              const nextPhaseIndex = (currentPhase + 1) % selectedExercise.phases.length;
              const nextPhaseDuration = selectedExercise.phases[nextPhaseIndex].duration * 1000;
              
              // Get the next phase name for audio
              const nextPhaseName = selectedExercise.phases[nextPhaseIndex].name.toLowerCase();
              
              if (nextPhaseName.includes('sisse') || nextPhaseName.includes('inhale')) {
                createBreathSound('inhale', selectedExercise.phases[nextPhaseIndex].duration);
              } else if (nextPhaseName.includes('välja') || nextPhaseName.includes('exhale')) {
                createBreathSound('exhale', selectedExercise.phases[nextPhaseIndex].duration);
              } else if (nextPhaseName.includes('hoia') || nextPhaseName.includes('hold')) {
                // Hold phases are silent - no audio
                console.log('[Mindfulness] Hold phase - no audio');
              } else {
                // Default to inhale sound for unknown phases
                createBreathSound('inhale', selectedExercise.phases[nextPhaseIndex].duration);
              }
              
              // Update phase state
              setCurrentPhase(nextPhaseIndex);
              
              // Check if we completed a full cycle
              if (nextPhaseIndex === 0) {
                setCurrentCycle((prevCycle) => {
                  const nextCycle = prevCycle + 1;
                  if (nextCycle >= totalCycles) {
                    setIsActive(false);
                    setIsCompleted(true);
                    
                    // Track weekend completion if coming from calendar
                    if (fromCalendar && dayNumber && user?.id) {
                      markWeekendCompleted(dayNumber, user.id);
                    }
                  }
                  return nextCycle;
                });
              }
              
              // Return the duration for the NEXT phase (which we just calculated)
              return nextPhaseDuration;
            }
            
            // For prep phase, return prep duration
            return 5000;
          }
          return prev - 100;
        });
      }, 100);
    }

    // Stop all sounds when exercise stops or completes
    if (!isActive || isCompleted) {
      stopAllSounds();
    }

    return () => {
      clearInterval(interval);
      stopAllSounds();
    };
  }, [isActive, isCompleted, phase, prepPhases, selectedExercise, currentPhase, totalCycles, fromCalendar, dayNumber, user, markWeekendCompleted, getCurrentPhaseDuration, stopAllSounds]);

  // Bug #4 fix: Store countdown interval ref for cleanup
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleStart = async () => {
    console.log('[Mindfulness] Starting exercise...');
    
    // Bug #4 fix: Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Initialize audio context with user interaction - critical for iOS
    const audioInitialized = await initializeAudioContext();
    console.log('[Mindfulness] Audio initialized:', audioInitialized);
    
    // For iOS, ensure we have proper audio unlock
    if (isIOS() && !iosAudioUnlocked) {
      await unlockIOSAudio();
    }
    
    setShowInstructions(false);
    setShowCountdown(true);
    setCountdownNumber(3);
    
    // Start countdown - Bug #4 fix: Store interval in ref for cleanup
    countdownIntervalRef.current = setInterval(() => {
      setCountdownNumber(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setShowCountdown(false);
          setIsActive(true);
          setIsCompleted(false);
          setCurrentCycle(0);
          setPhase('prep');
          setPrepBreaths(0);
          // Bug #1 fix: Use getCurrentPhaseDuration() instead of stale cycleDuration
          setTimeLeft(getCurrentPhaseDuration());
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Bug #4 fix: Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    // Bug #4 fix: Clear countdown if active
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Stop all active sounds when resetting
    stopAllSounds();
    
    setIsActive(false);
    setIsCompleted(false);
    setCurrentCycle(0);
    setPhase('prep');
    setPrepBreaths(0);
    // Bug #1 fix: Use getCurrentPhaseDuration() instead of stale cycleDuration
    setTimeLeft(getCurrentPhaseDuration());
    setShowInstructions(true);
    setShowCountdown(false);
    setCountdownNumber(3);
  };

  const getCircleScale = () => {
    // Bug #1 fix: Use getCurrentPhaseDuration() instead of stale cycleDuration
    const currentDuration = getCurrentPhaseDuration();
    const progress = (currentDuration - timeLeft) / currentDuration;
    if (phase === 'prep') {
      // Gentle pulsing for prep phase
      const isPrepInhale = prepBreaths % 2 === 0;
      if (isPrepInhale) {
        return 0.6 + (progress * 0.3); // Scale from 0.6 to 0.9
      } else {
        return 0.9 - (progress * 0.3); // Scale from 0.9 to 0.6
      }
    } else if (selectedExercise) {
      // Use selected exercise phase for main exercise
      const currentPhaseName = selectedExercise.phases[currentPhase]?.name.toLowerCase() || '';
      
      if (currentPhaseName.includes('sisse') || currentPhaseName.includes('inhale')) {
        // Natural inhale curve - starts gentle, accelerates, then eases out
        const easedProgress = 1 - Math.pow(1 - progress, 2.5); // More natural curve
        return 0.7 + (easedProgress * 0.3); // Scale from 0.7 to 1.0
      } else if (currentPhaseName.includes('välja') || currentPhaseName.includes('exhale')) {
        // Natural exhale curve - starts gentle, then accelerates
        const easedProgress = Math.pow(progress, 1.8); // More natural exhale
        return 1.0 - (easedProgress * 0.3); // Scale from 1.0 to 0.7
      } else if (currentPhaseName.includes('hoia') || currentPhaseName.includes('hold')) {
        return 0.85; // Slightly larger stable size for hold phases
      } else {
        // Default to natural inhale scaling
        const easedProgress = 1 - Math.pow(1 - progress, 2.5);
        return 0.7 + (easedProgress * 0.3);
      }
    } else {
      // Fallback to old logic
      return phase === 'inhale' ? 0.5 + (progress * 0.5) : 1.0 - (progress * 0.5);
    }
  };

  const getPhaseText = () => {
    if (phase === 'prep') {
      const isPrepInhale = prepBreaths % 2 === 0;
      return isPrepInhale ? 'Sisse' : 'Välja';
    }
    
    if (selectedExercise) {
      return selectedExercise.phases[currentPhase]?.name || 'Hingamine';
    }
    
    return phase === 'inhale' ? 'Sisse' : 'Välja';
  };

  const getPhaseInstruction = () => {
    if (phase === 'prep') {
      return `Ettevalmistus ${Math.floor(prepBreaths / 2) + 1}/3`;
    }
    
    if (selectedExercise) {
      return selectedExercise.phases[currentPhase]?.instruction || 'Järgi ringi liikumist';
    }
    
    return 'Hinga rahulikult';
  };

  const getPhaseColors = () => {
    if (phase === 'prep') {
      return 'hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.15)';
    }
    
    if (selectedExercise) {
      const currentPhaseName = selectedExercise.phases[currentPhase]?.name.toLowerCase() || '';
      
      if (currentPhaseName.includes('sisse') || currentPhaseName.includes('inhale')) {
        return 'hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.3)'; // Blue for inhale
      } else if (currentPhaseName.includes('välja') || currentPhaseName.includes('exhale')) {
        return 'hsl(var(--accent) / 0.4), hsl(var(--primary) / 0.3)'; // Orange for exhale
      } else if (currentPhaseName.includes('hoia') || currentPhaseName.includes('hold')) {
        return 'hsl(var(--secondary) / 0.3), hsl(var(--muted) / 0.2)'; // Gray for hold
      } else {
        return 'hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.2)'; // Default
      }
    }
    
    // Fallback to old logic
    return phase === 'inhale' 
      ? 'hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.2)' 
      : 'hsl(var(--accent) / 0.3), hsl(var(--primary) / 0.2)';
  };


  return (
    <>
      <style>
        {`
          @keyframes breathe {
            0%, 100% { 
              filter: brightness(1) saturate(1);
              transform: scale(1);
            }
            50% { 
              filter: brightness(1.1) saturate(1.2);
              transform: scale(1.02);
            }
          }
        `}
      </style>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8 text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Hingamine
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Vali sobiv hingamisharjutus oma vajadusele
          </p>
        </div>

        {/* Exercise Selection UI */}
        {showExerciseSelection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {breathingExercises.map((exercise) => (
              <Card 
                key={exercise.id}
                className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-0 bg-white/50 backdrop-blur-sm"
                onClick={() => {
                  setSelectedExercise(exercise);
                  setShowExerciseSelection(false);
                  setShowInstructions(true);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${exercise.color} flex items-center justify-center text-2xl`}>
                      {exercise.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {exercise.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {exercise.category}
                      </p>
                      <p className="text-sm text-gray-700 mb-3">
                        {exercise.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{Math.floor(exercise.totalDuration / 60)} min</span>
                        <span>•</span>
                        <span>{exercise.phases.length} faas</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Exercise Execution UI */}
        {!showExerciseSelection && selectedExercise && (
          <Card className="shadow-xl border-primary/10">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <span className="text-2xl">{selectedExercise.icon}</span>
                {selectedExercise.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedExercise.category}
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
          {/* Instructions */}
          {showInstructions && (
            <div className="space-y-6 p-8 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-primary">
                  {selectedExercise.name} - Juhend
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowExerciseSelection(true);
                    setSelectedExercise(null);
                  }}
                >
                  ← Tagasi
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30">
                  <p className="text-base text-gray-700">
                    {selectedExercise.instruction}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Hingamise rütm:</h4>
                  {selectedExercise.phases.map((phase, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{phase.name}</span>
                        <span className="text-gray-600 ml-2">({phase.duration}s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <p className="text-center text-sm text-muted-foreground italic pt-4">
                Võta aega, et ennast mugavalt sisse seada. Kui oled valmis, vajuta "Alusta"
              </p>
              {!audioSupported && (
                <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-warning-foreground text-center">
                    Heli ei ole selles brauseris toetatud, kuid harjutus toimib siiski visuaalse juhendamisega.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Countdown Display */}
          {showCountdown && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="text-6xl font-bold text-primary animate-pulse">
                {countdownNumber}
              </div>
              <div className="text-lg text-muted-foreground">
                Hingamisharjutus algab...
              </div>
              {!audioSupported && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 max-w-md">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                    <span className="font-medium">Lülita telefonist vaikimisrežiim välja</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    Et kuulda hingamise juhendamist, lülita telefonist vaikimisrežiim välja
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Silent Mode Indicator */}
          {!showInstructions && !showCountdown && !isCompleted && audioSupported && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-blue-800">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-medium">Vaikimisrežiim</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Lülita telefonist vaikimisrežiim välja, et kuulda hingamise juhendamist
              </p>
            </div>
          )}

          {/* Breathing Circle */}
          {!showInstructions && !showCountdown && (
            <div className="flex justify-center items-center py-12">
              <div
                className="relative transition-transform"
                style={{
                  transform: `scale(${isActive ? getCircleScale() : 0.75})`,
                  transitionDuration: `${getCurrentPhaseDuration() / 1000}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Natural breathing curve
                }}
              >
                <div 
                  className="w-64 h-64 rounded-full backdrop-blur-xl border-2 border-primary/20 shadow-3xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `radial-gradient(circle at ${50 + Math.sin(Date.now() / 1000) * 10}% ${50 + Math.cos(Date.now() / 1000) * 10}%, ${getPhaseColors()})`,
                    boxShadow: `
                      0 0 0 1px rgba(255,255,255,0.1),
                      0 8px 32px rgba(0,0,0,0.12),
                      0 16px 64px rgba(0,0,0,0.08),
                      0 32px 128px rgba(0,0,0,0.04)
                    `,
                    animation: 'breathe 4s ease-in-out infinite',
                  }}
                >
                  {/* Additional blur layer for depth */}
                  <div 
                    className="absolute inset-0 rounded-full backdrop-blur-lg opacity-50"
                    style={{
                      background: `radial-gradient(circle, ${getPhaseColors()})`,
                    }}
                  />
                  <div className="text-center relative z-10">
                    <div className="text-3xl font-bold mb-2 text-foreground">
                      {isActive ? getPhaseText() : 'Valmis?'}
                    </div>
                    <div className="text-base text-muted-foreground">
                      {isActive ? getPhaseInstruction() : 'Alusta harjutust'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {!isCompleted && !showInstructions && !showCountdown && phase !== 'prep' && (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="text-center text-lg font-semibold">
                  Tsükkel {Math.min(currentCycle + 1, totalCycles)} / {totalCycles}
                </div>
                <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentCycle / totalCycles) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Phase Progress */}
              {selectedExercise && (
                <div className="space-y-2">
                  <div className="text-center text-sm font-medium text-muted-foreground">
                    {selectedExercise.phases[currentPhase]?.name} ({selectedExercise.phases[currentPhase]?.duration}s)
                  </div>
                  <div className="w-full bg-secondary/20 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-100"
                      style={{ width: `${((getCurrentPhaseDuration() - timeLeft) / getCurrentPhaseDuration()) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preparation Progress */}
          {!isCompleted && !showInstructions && !showCountdown && phase === 'prep' && (
            <div className="space-y-3">
              <div className="text-center text-xl font-semibold text-primary">
                Ettevalmistus
              </div>
              <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(prepBreaths / (prepPhases * 2)) * 100}%` }}
                />
              </div>
              <p className="text-center text-base text-muted-foreground">
                {Math.floor(prepBreaths / 2) + 1}. ettevalmistav hingamine
              </p>
            </div>
          )}

          {/* Completion Message */}
          {isCompleted && (
            <div className="text-center space-y-5 p-8 bg-gradient-to-br from-success/10 to-primary/5 rounded-xl border border-success/30">
              <div className="text-4xl">✓</div>
              <div className="text-2xl font-semibold text-success">
                Harjutus lõpetatud!
              </div>
              <p className="text-lg text-success-foreground max-w-md mx-auto">
                {getExerciseSpecificMessage()}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4 pt-4">
            {showInstructions && (
              <Button onClick={handleStart} size="lg" className="px-10">
                <Play className="h-5 w-5 mr-2" />
                Alusta
              </Button>
            )}
            
            {isActive && !showInstructions && !showCountdown && (
              <Button onClick={handleReset} variant="outline" size="lg" className="px-8">
                <RotateCcw className="h-5 w-5 mr-2" />
                Lõpeta
              </Button>
            )}
            
            {(isCompleted || (!isActive && !showInstructions && !showCountdown)) && (
              <div className="flex gap-3">
                {fromCalendar && (
                  <Button 
                    onClick={() => navigate(returnPath)} 
                    size="lg" 
                    className="px-8"
                  >
                    Tagasi kalendrisse
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline" size="lg" className="px-8">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Algusesse
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          {!showInstructions && !showCountdown && !isCompleted && (
            <div className="text-center space-y-3 pt-2">
              <p className="text-base text-muted-foreground font-medium">Järgi ringi liikumist:</p>
              <div className="space-y-2 max-w-md mx-auto">
                <p className="text-sm">Ring suureneb → <span className="font-semibold text-primary">Hinga sisse</span> (5 sekundit)</p>
                <p className="text-sm">Ring väheneb → <span className="font-semibold text-accent">Hinga välja</span> (5 sekundit)</p>
              </div>
              <p className="text-sm text-muted-foreground/80 pt-4">
                {audioSupported ? 
                  "Kui kuuled tuule heli, see juhendab sinu hingamist" : 
                  "Järgi visuaalset juhendamist - heli ei ole selles brauseris toetatud"
                }
              </p>
              {isIOS() && (
                <p className="text-xs text-muted-foreground/60 pt-2">
                  iOS kasutajad: veenduge, et telefon ei ole vaikses režiimis ja helitugevus on üles keeratud
                </p>
              )}
            </div>
        )}
      </CardContent>
    </Card>
  )}
</div>
</div>
</>
  );
}