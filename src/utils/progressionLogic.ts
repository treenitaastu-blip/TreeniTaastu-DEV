// Progression logic utilities for the new feedback system

export type ExerciseType = 'compound' | 'isolation' | 'bodyweight';
export type ExerciseFeedback = 'too_easy' | 'just_right' | 'too_hard';
export type WorkoutFeedback = {
  energy: 'low' | 'normal' | 'high';
  soreness: 'none' | 'mild' | 'high';
  pump: 'poor' | 'good' | 'excellent';
  joint_pain: boolean;
  overall_difficulty: 'too_easy' | 'just_right' | 'too_hard';
  notes?: string;
};

export interface ExerciseProgression {
  newWeight: number;
  change: number;
  reason: string;
  progressionType: 'increase' | 'decrease' | 'maintain';
}

export interface WorkoutProgression {
  volumeMultiplier: number;
  intensityMultiplier: number;
  reason: string;
  recommendations: string[];
}

// Exercise-specific weight increments (in kg)
export const EXERCISE_INCREMENT_MAP: Record<string, number> = {
  // Compound movements - larger increments
  'squat': 2.5,
  'deadlift': 2.5,
  'bench_press': 2.5,
  'overhead_press': 2.5,
  'barbell_row': 2.5,
  'compound': 2.5,
  
  // Isolation movements - smaller increments
  'bicep_curl': 1.25,
  'tricep_extension': 1.25,
  'lateral_raise': 1.25,
  'rear_delt_fly': 1.25,
  'leg_curl': 1.25,
  'leg_extension': 1.25,
  'isolation': 1.25,
  
  // Bodyweight exercises - no weight change
  'bodyweight': 0,
};

// Calculate exercise progression based on feedback
export function calculateExerciseProgression(
  feedback: ExerciseFeedback,
  currentWeight: number,
  exerciseType: ExerciseType,
  exerciseName?: string
): ExerciseProgression {
  
  // Handle bodyweight exercises
  if (exerciseType === 'bodyweight' || !currentWeight) {
    return {
      newWeight: 0,
      change: 0,
      reason: getBodyweightReason(feedback),
      progressionType: 'maintain'
    };
  }

  const increment = getExerciseIncrement(exerciseName, exerciseType);
  const baseIncrease = exerciseType === 'compound' ? 0.025 : 0.02; // 2.5% vs 2%
  const minIncrement = increment;
  
  let newWeight = currentWeight;
  let reason = '';
  let progressionType: 'increase' | 'decrease' | 'maintain' = 'maintain';
  
  switch(feedback) {
    case "too_easy":
      const increase = Math.max(currentWeight * baseIncrease, minIncrement);
      newWeight = Math.round((currentWeight + increase) * 2) / 2; // Round to 0.5kg
      reason = `Too easy - increasing by ${(newWeight - currentWeight).toFixed(1)}kg`;
      progressionType = 'increase';
      break;
      
    case "too_hard":
      const decrease = Math.max(currentWeight * baseIncrease, minIncrement);
      newWeight = Math.round((currentWeight - decrease) * 2) / 2; // Round to 0.5kg
      newWeight = Math.max(newWeight, 0); // Never go below 0
      reason = `Too hard - decreasing by ${(currentWeight - newWeight).toFixed(1)}kg`;
      progressionType = 'decrease';
      break;
      
    case "just_right":
      newWeight = currentWeight;
      reason = 'Perfect difficulty - maintaining weight';
      progressionType = 'maintain';
      break;
  }
  
  return {
    newWeight,
    change: newWeight - currentWeight,
    reason,
    progressionType
  };
}

// Calculate workout-level progression based on comprehensive feedback
export function calculateWorkoutProgression(feedback: WorkoutFeedback): WorkoutProgression {
  let volumeMultiplier = 1.0;
  let intensityMultiplier = 1.0;
  const recommendations: string[] = [];
  
  // Energy-based adjustments
  if (feedback.energy === 'low' && feedback.soreness === 'high') {
    volumeMultiplier = 0.9; // Reduce volume
    recommendations.push('Reduce volume due to low energy and high soreness');
  } else if (feedback.energy === 'high' && feedback.soreness === 'none') {
    volumeMultiplier = 1.05; // Increase volume
    recommendations.push('Increase volume - you have high energy and no soreness');
  }
  
  // Soreness-based adjustments
  if (feedback.soreness === 'high') {
    volumeMultiplier *= 0.95; // Further reduce volume
    recommendations.push('Reduce volume due to high soreness');
  } else if (feedback.soreness === 'none' && feedback.energy === 'normal') {
    volumeMultiplier *= 1.02; // Slight volume increase
    recommendations.push('Slight volume increase - no soreness');
  }
  
  // Pump quality adjustments
  if (feedback.pump === 'poor' && feedback.energy === 'normal') {
    volumeMultiplier *= 1.03; // Increase volume for better pump
    recommendations.push('Increase volume to improve muscle pump');
  } else if (feedback.pump === 'excellent' && feedback.soreness === 'mild') {
    volumeMultiplier *= 0.98; // Slight volume reduction
    recommendations.push('Maintain current volume - excellent pump achieved');
  }
  
  // Joint pain adjustments
  if (feedback.joint_pain) {
    intensityMultiplier *= 0.95; // Reduce intensity
    recommendations.push('Reduce intensity due to joint pain');
  }
  
  // Overall difficulty adjustments
  if (feedback.overall_difficulty === 'too_easy') {
    volumeMultiplier *= 1.05; // Increase volume
    intensityMultiplier *= 1.02; // Slight intensity increase
    recommendations.push('Increase volume and intensity - workout too easy');
  } else if (feedback.overall_difficulty === 'too_hard') {
    volumeMultiplier *= 0.9; // Reduce volume
    intensityMultiplier *= 0.95; // Reduce intensity
    recommendations.push('Reduce volume and intensity - workout too hard');
  }
  
  // Cap adjustments to reasonable ranges
  volumeMultiplier = Math.max(0.8, Math.min(1.2, volumeMultiplier));
  intensityMultiplier = Math.max(0.85, Math.min(1.15, intensityMultiplier));
  
  return {
    volumeMultiplier,
    intensityMultiplier,
    reason: `Based on energy: ${feedback.energy}, soreness: ${feedback.soreness}, pump: ${feedback.pump}`,
    recommendations
  };
}

// Get exercise-specific increment
function getExerciseIncrement(exerciseName?: string, exerciseType?: ExerciseType): number {
  if (exerciseName) {
    const name = exerciseName.toLowerCase().replace(/\s+/g, '_');
    if (EXERCISE_INCREMENT_MAP[name]) {
      return EXERCISE_INCREMENT_MAP[name];
    }
  }
  
  if (exerciseType) {
    return EXERCISE_INCREMENT_MAP[exerciseType] || 2.5;
  }
  
  return 2.5; // Default increment
}

// Get bodyweight exercise progression reason
function getBodyweightReason(feedback: ExerciseFeedback): string {
  switch(feedback) {
    case "too_easy":
      return "Too easy - add 1 rep per set next time";
    case "too_hard":
      return "Too hard - reduce 1 rep per set next time";
    default:
      return "Perfect difficulty - maintain current reps";
  }
}

// Determine exercise type from exercise name
export function determineExerciseType(exerciseName: string): ExerciseType {
  const name = exerciseName.toLowerCase();
  
  // Compound movements
  const compoundKeywords = ['squat', 'deadlift', 'bench', 'press', 'row', 'pull', 'push'];
  if (compoundKeywords.some(keyword => name.includes(keyword))) {
    return 'compound';
  }
  
  // Bodyweight movements
  const bodyweightKeywords = ['push-up', 'pull-up', 'dip', 'chin-up', 'plank', 'burpee'];
  if (bodyweightKeywords.some(keyword => name.includes(keyword))) {
    return 'bodyweight';
  }
  
  // Default to isolation
  return 'isolation';
}

// Format progression summary for display
export function formatProgressionSummary(progression: ExerciseProgression): string {
  if (progression.change > 0) {
    return `+${progression.change.toFixed(1)}kg (${progression.reason})`;
  } else if (progression.change < 0) {
    return `${progression.change.toFixed(1)}kg (${progression.reason})`;
  } else {
    return `No change (${progression.reason})`;
  }
}

// Format workout progression summary
export function formatWorkoutProgressionSummary(progression: WorkoutProgression): string {
  const volumeChange = ((progression.volumeMultiplier - 1) * 100).toFixed(1);
  const intensityChange = ((progression.intensityMultiplier - 1) * 100).toFixed(1);
  
  let summary = '';
  if (progression.volumeMultiplier !== 1.0) {
    summary += `Volume: ${volumeChange}%`;
  }
  if (progression.intensityMultiplier !== 1.0) {
    if (summary) summary += ', ';
    summary += `Intensity: ${intensityChange}%`;
  }
  
  return summary || 'No changes recommended';
}
