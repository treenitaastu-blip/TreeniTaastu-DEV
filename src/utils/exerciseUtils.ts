/**
 * Shared utility functions for exercise processing and validation
 */

export interface ProcessedExercise {
  reps: string;
  reps_per_side: number | null;
  total_reps: number;
  is_bodyweight?: boolean;
}

export interface ExerciseInput {
  reps: string;
  is_unilateral?: boolean;
  weight_kg?: number | null;
}

/**
 * Process exercise input for unilateral exercises and reps parsing
 * Handles both formats: "8-12" and "8 per side"
 */
export function processExerciseInput(input: ExerciseInput): ProcessedExercise {
  const { reps, is_unilateral, weight_kg } = input;
  
  let reps_per_side: number | null = null;
  let total_reps: number;
  let display_reps: string;
  
  if (is_unilateral) {
    // For unilateral exercises, extract the number from "8 per side" or just "8"
    const repsNumber = parseInt(reps.replace(/[^\d]/g, '')) || 0;
    reps_per_side = repsNumber;
    total_reps = repsNumber * 2;
    display_reps = `${repsNumber} per side`;
  } else {
    // For bilateral exercises, keep original format if it's a range (e.g., "8-12")
    // Otherwise convert to number string
    const repsNumber = parseInt(reps.replace(/[^\d]/g, '')) || 0;
    if (reps.includes('-')) {
      // Keep range format like "8-12"
      display_reps = reps;
    } else {
      display_reps = repsNumber.toString();
    }
    total_reps = repsNumber;
  }
  
  const is_bodyweight = weight_kg === 0 || weight_kg === null;
  
  return {
    reps: display_reps,
    reps_per_side,
    total_reps,
    is_bodyweight
  };
}

export interface ExerciseValidationErrors {
  exercise_name?: string;
  sets?: string;
  reps?: string;
  weight_kg?: string;
  seconds?: string;
}

/**
 * Validate exercise data - returns error messages for invalid fields
 * This is defensive validation that prevents saving invalid data
 */
export function validateExercise(input: {
  exercise_name?: string;
  sets?: number;
  reps?: string;
  weight_kg?: number | null;
  seconds?: number | null;
}): ExerciseValidationErrors {
  const errors: ExerciseValidationErrors = {};
  
  // Exercise name is required
  if (!input.exercise_name || !input.exercise_name.trim()) {
    errors.exercise_name = 'Harjutuse nimi on kohustuslik';
  }
  
  // Sets must be between 1 and 50
  if (input.sets !== undefined) {
    if (input.sets < 1) {
      errors.sets = 'Seeriad peavad olema vähemalt 1';
    } else if (input.sets > 50) {
      errors.sets = 'Seeriad ei tohi ületada 50';
    }
  }
  
  // Determine if this is a time-based exercise
  const isTimeBased = input.seconds !== null && input.seconds !== undefined && input.seconds > 0;
  const hasWeight = input.weight_kg !== null && input.weight_kg !== undefined && input.weight_kg > 0;
  
  if (isTimeBased) {
    // Time-based exercises: seconds required, reps optional, weight should be null/0
    if (!input.seconds || input.seconds < 1) {
      errors.seconds = 'Aeg (sekundid) on kohustuslik ajaharjutustele';
    }
    // Note: reps are optional for time-based exercises
    // Weight should be null or 0 for time-based exercises
    if (hasWeight) {
      errors.weight_kg = 'Ajaharjutused ei vaja kaalu';
    }
  } else {
    // Weight-based or bodyweight exercises: reps required, weight optional
    if (!input.reps || !input.reps.trim()) {
      errors.reps = 'Kordused on kohustuslikud';
    } else {
      const repsNumber = parseInt(input.reps.replace(/[^\d]/g, ''));
      if (repsNumber < 1) {
        errors.reps = 'Korduste arv peab olema vähemalt 1';
      }
    }
    
    // Weight-based exercises require weight > 0
    if (hasWeight && input.weight_kg !== null && input.weight_kg <= 0) {
      errors.weight_kg = 'Kaal peab olema suurem kui 0';
    }
  }
  
  return errors;
}

/**
 * Check if exercise is valid (no errors)
 */
export function isExerciseValid(input: Parameters<typeof validateExercise>[0]): boolean {
  const errors = validateExercise(input);
  return Object.keys(errors).length === 0;
}
