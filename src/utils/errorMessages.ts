// Comprehensive error message system for the PT application
// Provides user-friendly, actionable error messages in Estonian

export interface ErrorMessage {
  title: string;
  description: string;
  action?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Common error patterns and their user-friendly messages
export const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  // Database/Connection errors
  'NETWORK_ERROR': {
    title: 'Ühenduse viga',
    description: 'Internetiühendus on katkenud. Palun kontrolli oma ühendust ja proovi uuesti.',
    action: 'Kontrolli ühendust',
    severity: 'high'
  },
  'TIMEOUT_ERROR': {
    title: 'Aegumise viga',
    description: 'Päring võttis liiga kaua aega. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'medium'
  },
  'DATABASE_ERROR': {
    title: 'Andmebaasi viga',
    description: 'Andmebaasiga ühenduse loomisel tekkis viga. Palun proovi uuesti või võta ühendust toega.',
    action: 'Võta ühendust toega',
    severity: 'critical'
  },

  // Authentication errors
  'AUTH_REQUIRED': {
    title: 'Sisselogimine nõutav',
    description: 'Selle toimingu tegemiseks pead olema sisse logitud.',
    action: 'Logi sisse',
    severity: 'medium'
  },
  'AUTH_EXPIRED': {
    title: 'Sessioon aegunud',
    description: 'Sinu sessioon on aegunud. Palun logi uuesti sisse.',
    action: 'Logi uuesti sisse',
    severity: 'medium'
  },
  'PERMISSION_DENIED': {
    title: 'Ligipääs keelatud',
    description: 'Sul pole õigusi selle toimingu tegemiseks. Palun võta ühendust administraatoriga.',
    action: 'Võta ühendust administraatoriga',
    severity: 'high'
  },

  // Program/Template errors
  'PROGRAM_NOT_FOUND': {
    title: 'Programm ei leitud',
    description: 'Otsitud programm ei ole enam saadaval või on kustutatud.',
    action: 'Värskenda lehte',
    severity: 'medium'
  },
  'TEMPLATE_NOT_FOUND': {
    title: 'Mall ei leitud',
    description: 'Otsitud mall ei ole enam saadaval või on kustutatud.',
    action: 'Värskenda lehte',
    severity: 'medium'
  },
  'PROGRAM_ASSIGNMENT_FAILED': {
    title: 'Programmi määramine ebaõnnestus',
    description: 'Programmi määramine kasutajale ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'high'
  },
  'PROGRAM_DELETION_FAILED': {
    title: 'Programmi kustutamine ebaõnnestus',
    description: 'Programmi kustutamine ebaõnnestus. Palun proovi uuesti või võta ühendust toega.',
    action: 'Võta ühendust toega',
    severity: 'high'
  },

  // Workout errors
  'WORKOUT_START_FAILED': {
    title: 'Treeningu alustamine ebaõnnestus',
    description: 'Treeningu alustamine ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'medium'
  },
  'WORKOUT_SAVE_FAILED': {
    title: 'Treeningu salvestamine ebaõnnestus',
    description: 'Treeningu andmete salvestamine ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'high'
  },
  'WORKOUT_COMPLETE_FAILED': {
    title: 'Treeningu lõpetamine ebaõnnestus',
    description: 'Treeningu lõpetamine ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'high'
  },
  'EXERCISE_SAVE_FAILED': {
    title: 'Harjutuse salvestamine ebaõnnestus',
    description: 'Harjutuse andmete salvestamine ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'medium'
  },

  // Progression errors
  'PROGRESSION_ANALYSIS_FAILED': {
    title: 'Progressiooni analüüs ebaõnnestus',
    description: 'Automaatne progressiooni analüüs ebaõnnestus. Sinu programm jätkub praeguste seadistustega.',
    action: 'Jätka treeningut',
    severity: 'low'
  },
  'PROGRESSION_UPDATE_FAILED': {
    title: 'Progressiooni uuendamine ebaõnnestus',
    description: 'Programmi progressiooni uuendamine ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'medium'
  },

  // Validation errors
  'VALIDATION_ERROR': {
    title: 'Andmete valideerimise viga',
    description: 'Sisestatud andmed ei ole korrektsed. Palun kontrolli oma sisestust.',
    action: 'Kontrolli andmeid',
    severity: 'medium'
  },
  'REQUIRED_FIELD_MISSING': {
    title: 'Kohustuslik väli puudub',
    description: 'Palun täida kõik kohustuslikud väljad.',
    action: 'Täida kohustuslikud väljad',
    severity: 'medium'
  },
  'INVALID_EMAIL': {
    title: 'Vigane e-posti aadress',
    description: 'Sisestatud e-posti aadress ei ole korrektne.',
    action: 'Kontrolli e-posti aadressi',
    severity: 'medium'
  },

  // File/Upload errors
  'FILE_UPLOAD_FAILED': {
    title: 'Faili üleslaadimine ebaõnnestus',
    description: 'Faili üleslaadimine ebaõnnestus. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'medium'
  },
  'FILE_TOO_LARGE': {
    title: 'Fail on liiga suur',
    description: 'Valitud fail on liiga suur. Palun vali väiksem fail.',
    action: 'Vali väiksem fail',
    severity: 'medium'
  },
  'INVALID_FILE_TYPE': {
    title: 'Vigane faili tüüp',
    description: 'Valitud faili tüüp ei ole toetatud.',
    action: 'Vali toetatud faili tüüp',
    severity: 'medium'
  },

  // System errors
  'SYSTEM_ERROR': {
    title: 'Süsteemi viga',
    description: 'Süsteemis tekkis ootamatu viga. Palun proovi uuesti või võta ühendust toega.',
    action: 'Võta ühendust toega',
    severity: 'critical'
  },
  'SERVICE_UNAVAILABLE': {
    title: 'Teenus pole saadaval',
    description: 'Teenus on ajutiselt kättesaamatu. Palun proovi hiljem uuesti.',
    action: 'Proovi hiljem uuesti',
    severity: 'high'
  }
};

// Error pattern matching for dynamic error detection
export const ERROR_PATTERNS = [
  {
    pattern: /network|connection|internet/i,
    error: 'NETWORK_ERROR'
  },
  {
    pattern: /timeout|timed out/i,
    error: 'TIMEOUT_ERROR'
  },
  {
    pattern: /database|db|sql/i,
    error: 'DATABASE_ERROR'
  },
  {
    pattern: /auth|login|session/i,
    error: 'AUTH_REQUIRED'
  },
  {
    pattern: /permission|access|forbidden/i,
    error: 'PERMISSION_DENIED'
  },
  {
    pattern: /not found|missing|deleted/i,
    error: 'PROGRAM_NOT_FOUND'
  },
  {
    pattern: /validation|invalid|required/i,
    error: 'VALIDATION_ERROR'
  },
  {
    pattern: /file|upload/i,
    error: 'FILE_UPLOAD_FAILED'
  },
  {
    pattern: /system|server|internal/i,
    error: 'SYSTEM_ERROR'
  }
];

// Function to get user-friendly error message
export function getErrorMessage(error: any, context?: string): ErrorMessage {
  // Check for specific error codes first
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // Check for error message patterns
  const errorMessage = error?.message || error?.toString() || '';
  
  for (const { pattern, error: errorCode } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return ERROR_MESSAGES[errorCode];
    }
  }

  // Context-specific fallbacks
  if (context) {
    const contextErrors: Record<string, string> = {
      'workout_start': 'WORKOUT_START_FAILED',
      'workout_save': 'WORKOUT_SAVE_FAILED',
      'workout_complete': 'WORKOUT_COMPLETE_FAILED',
      'exercise_save': 'EXERCISE_SAVE_FAILED',
      'program_assignment': 'PROGRAM_ASSIGNMENT_FAILED',
      'program_deletion': 'PROGRAM_DELETION_FAILED',
      'progression_analysis': 'PROGRESSION_ANALYSIS_FAILED',
      'progression_update': 'PROGRESSION_UPDATE_FAILED'
    };

    if (contextErrors[context]) {
      return ERROR_MESSAGES[contextErrors[context]];
    }
  }

  // Default error message
  return {
    title: 'Viga',
    description: 'Tekkis ootamatu viga. Palun proovi uuesti.',
    action: 'Proovi uuesti',
    severity: 'medium'
  };
}

// Function to get severity-based styling
export function getSeverityStyles(severity: string) {
  const styles = {
    low: {
      variant: 'default' as const,
      className: 'text-blue-600'
    },
    medium: {
      variant: 'destructive' as const,
      className: 'text-orange-600'
    },
    high: {
      variant: 'destructive' as const,
      className: 'text-red-600'
    },
    critical: {
      variant: 'destructive' as const,
      className: 'text-red-800 bg-red-50'
    }
  };

  return styles[severity as keyof typeof styles] || styles.medium;
}

// Function to get action button text
export function getActionButtonText(action?: string): string {
  const actionTexts: Record<string, string> = {
    'Kontrolli ühendust': 'Kontrolli ühendust',
    'Proovi uuesti': 'Proovi uuesti',
    'Võta ühendust toega': 'Võta ühendust toega',
    'Logi sisse': 'Logi sisse',
    'Logi uuesti sisse': 'Logi uuesti sisse',
    'Võta ühendust administraatoriga': 'Võta ühendust administraatoriga',
    'Värskenda lehte': 'Värskenda lehte',
    'Jätka treeningut': 'Jätka treeningut',
    'Kontrolli andmeid': 'Kontrolli andmeid',
    'Täida kohustuslikud väljad': 'Täida kohustuslikud väljad',
    'Kontrolli e-posti aadressi': 'Kontrolli e-posti aadressi',
    'Vali väiksem fail': 'Vali väiksem fail',
    'Vali toetatud faili tüüp': 'Vali toetatud faili tüüp',
    'Proovi hiljem uuesti': 'Proovi hiljem uuesti'
  };

  return actionTexts[action || ''] || 'Proovi uuesti';
}
