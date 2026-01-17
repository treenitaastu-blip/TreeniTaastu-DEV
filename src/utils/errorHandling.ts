import { toast } from '@/hooks/use-toast';

export interface ErrorContext {
  operation: string;
  resource?: string;
  userId?: string;
  programId?: string;
  templateId?: string;
}

export interface PermissionError {
  code: string;
  message: string;
  suggestion: string;
  action?: string;
}

// Common permission error mappings
export const PERMISSION_ERRORS: Record<string, PermissionError> = {
  'PGRST301': {
    code: 'PGRST301',
    message: 'Access denied - insufficient permissions',
    suggestion: 'Please ensure you have the correct role to perform this action.',
    action: 'contact_admin'
  },
  'PGRST203': {
    code: 'PGRST203',
    message: 'Function not found or access denied',
    suggestion: 'The requested function is not available or you lack permission to access it.',
    action: 'refresh_page'
  },
  'PGRST204': {
    code: 'PGRST204',
    message: 'Resource not found',
    suggestion: 'The requested resource does not exist or has been deleted.',
    action: 'refresh_data'
  },
  'PGRST205': {
    code: 'PGRST205',
    message: 'Invalid request parameters',
    suggestion: 'Please check your input and try again.',
    action: 'check_input'
  },
  'PGRST206': {
    code: 'PGRST206',
    message: 'Database constraint violation',
    suggestion: 'The operation violates database constraints. Please check your data.',
    action: 'check_data'
  },
  'PGRST207': {
    code: 'PGRST207',
    message: 'Row Level Security policy violation',
    suggestion: 'You do not have permission to access this resource.',
    action: 'contact_admin'
  },
  'PGRST208': {
    code: 'PGRST208',
    message: 'Authentication required',
    suggestion: 'Please log in to continue.',
    action: 'login'
  },
  'PGRST209': {
    code: 'PGRST209',
    message: 'Rate limit exceeded',
    suggestion: 'Too many requests. Please wait a moment and try again.',
    action: 'wait_retry'
  },
  'PGRST210': {
    code: 'PGRST210',
    message: 'Service temporarily unavailable',
    suggestion: 'The service is temporarily unavailable. Please try again later.',
    action: 'retry_later'
  }
};

// Generic error patterns
export const ERROR_PATTERNS = [
  {
    pattern: /permission denied/i,
    error: {
      code: 'PERMISSION_DENIED',
      message: 'Access denied',
      suggestion: 'You do not have permission to perform this action.',
      action: 'contact_admin'
    }
  },
  {
    pattern: /not found/i,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      suggestion: 'The requested resource does not exist.',
      action: 'refresh_data'
    }
  },
  {
    pattern: /unauthorized/i,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      suggestion: 'Please log in to continue.',
      action: 'login'
    }
  },
  {
    pattern: /forbidden/i,
    error: {
      code: 'FORBIDDEN',
      message: 'Access forbidden',
      suggestion: 'You do not have permission to access this resource.',
      action: 'contact_admin'
    }
  },
  {
    pattern: /timeout/i,
    error: {
      code: 'TIMEOUT',
      message: 'Request timeout',
      suggestion: 'The request took too long. Please try again.',
      action: 'retry'
    }
  },
  {
    pattern: /network/i,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Network error',
      suggestion: 'Please check your internet connection and try again.',
      action: 'check_connection'
    }
  }
];

export function parseError(error: unknown, context?: ErrorContext): PermissionError {
  // Type guard for error objects
  const isErrorWithCode = (err: unknown): err is { code: string } => {
    return typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'string';
  };

  const isErrorWithMessage = (err: unknown): err is { message: string } => {
    return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string';
  };

  // Check for specific error codes first
  if (isErrorWithCode(error) && PERMISSION_ERRORS[error.code]) {
    return PERMISSION_ERRORS[error.code];
  }

  // Check for error message patterns
  const errorMessage = isErrorWithMessage(error) 
    ? error.message 
    : error instanceof Error 
      ? error.message 
      : String(error);
  
  for (const { pattern, error: errorInfo } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return errorInfo;
    }
  }

  // Default error
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    suggestion: 'Please try again or contact support if the problem persists.',
    action: 'retry'
  };
}

export function handlePermissionError(
  error: unknown, 
  context: ErrorContext,
  showToast: boolean = true
): PermissionError {
  const parsedError = parseError(error, context);
  
  if (showToast) {
    toast({
      title: parsedError.message,
      description: parsedError.suggestion,
      variant: "destructive",
      action: parsedError.action ? {
        label: getActionLabel(parsedError.action),
        onClick: () => handleErrorAction(parsedError.action!, context)
      } : undefined
    });
  }

  // Log the error for debugging
  console.error('Permission error:', {
    originalError: error,
    parsedError,
    context,
    timestamp: new Date().toISOString()
  });

  return parsedError;
}

function getActionLabel(action: string): string {
  const actionLabels: Record<string, string> = {
    'contact_admin': 'Contact Admin',
    'refresh_page': 'Refresh Page',
    'refresh_data': 'Refresh Data',
    'check_input': 'Check Input',
    'check_data': 'Check Data',
    'login': 'Login',
    'wait_retry': 'Wait & Retry',
    'retry_later': 'Retry Later',
    'retry': 'Retry',
    'check_connection': 'Check Connection'
  };
  
  return actionLabels[action] || 'Retry';
}

function handleErrorAction(action: string, context: ErrorContext): void {
  switch (action) {
    case 'contact_admin':
      // Could open a support modal or redirect to contact page
      console.log('Contact admin action triggered');
      break;
    case 'refresh_page':
      window.location.reload();
      break;
    case 'refresh_data':
      // Could trigger a data refresh in the component
      console.log('Refresh data action triggered');
      break;
    case 'login':
      // Could redirect to login page
      window.location.href = '/login';
      break;
    case 'retry':
    case 'wait_retry':
    case 'retry_later':
      // Could implement retry logic
      console.log('Retry action triggered');
      break;
    default:
      console.log('Unknown action:', action);
  }
}

// Specific error handlers for common operations
export function handleProgramAccessError(error: unknown, programId?: string): PermissionError {
  return handlePermissionError(error, {
    operation: 'access_program',
    resource: 'client_program',
    programId
  });
}

export function handleTemplateAccessError(error: unknown, templateId?: string): PermissionError {
  return handlePermissionError(error, {
    operation: 'access_template',
    resource: 'workout_template',
    templateId
  });
}

export function handleWorkoutSessionError(error: unknown, sessionId?: string): PermissionError {
  return handlePermissionError(error, {
    operation: 'access_workout_session',
    resource: 'workout_session',
    programId: sessionId
  });
}

export function handleExerciseAccessError(error: unknown, exerciseId?: string): PermissionError {
  return handlePermissionError(error, {
    operation: 'access_exercise',
    resource: 'client_item',
    programId: exerciseId
  });
}

// Utility function to check if an error is a permission error
export function isPermissionError(error: unknown): boolean {
  const parsedError = parseError(error);
  return parsedError.code !== 'UNKNOWN_ERROR';
}

// Utility function to get user-friendly error message
export function getUserFriendlyErrorMessage(error: unknown, context?: ErrorContext): string {
  const parsedError = parseError(error, context);
  return `${parsedError.message}. ${parsedError.suggestion}`;
}
