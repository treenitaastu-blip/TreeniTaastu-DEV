/**
 * Bundle Optimization Utilities
 * This file contains utilities to identify and remove unused code to reduce bundle size
 */

// List of potentially unused components that can be removed
export const UNUSED_COMPONENTS = [
  // Old components that might not be used
  'src/components/workout/RestTimer.tsx', // Replaced by ModernRestTimer
  'src/components/workout/ModernExerciseCard.tsx', // Replaced by SmartExerciseCard
  'src/components/workout/RPEInput.tsx', // Integrated into SmartExerciseCard
  'src/components/workout/RIRInput.tsx', // Integrated into SmartExerciseCard
  'src/components/workout/RPERIRDialog.tsx', // Replaced by EnhancedRPERIRDialog
  'src/components/workout/SessionProgress.tsx', // Not used in current implementation
  'src/components/MobileOptimizedButton.tsx', // Not used
  'src/components/DebugOverlay.tsx', // Debug only
  'src/components/WeekendModal.tsx', // Not used
  'src/components/Paywall.tsx', // Replaced by ProgramPaywall
  'src/components/Logout.tsx', // Not used
  'src/components/booking/PaymentForm.tsx', // Not used
  'src/components/booking/CalendarSlotPicker.tsx', // Not used
  'src/components/booking/BookingModal.tsx', // Not used
  'src/components/ui/typing-indicator.tsx', // Not used
  'src/components/ui/rich-text-editor.tsx', // Not used
  'src/components/GooglePasswordSetup.tsx', // Not used
];

// List of potentially unused pages
export const UNUSED_PAGES = [
  'src/pages/personal-training/PersonalTrainingPage.tsx', // Empty placeholder
  'src/pages/PTDebug.tsx', // Debug only
  'src/pages/TrainingJournal.tsx', // Not used
  'src/pages/Progress.tsx', // Not used
  'src/pages/ErrorBoundaryFallback.tsx', // Not used
];

// List of potentially unused hooks
export const UNUSED_HOOKS = [
  'src/hooks/useAnalytics.ts', // Not used in current implementation
  'src/hooks/useProgressTracking.ts', // Not used in current implementation
];

// List of potentially unused utilities
export const UNUSED_UTILITIES = [
  'src/utils/dateUtils.ts', // Not used
  'src/utils/validationUtils.ts', // Not used
  'src/utils/formatUtils.ts', // Not used
];

// List of potentially unused types
export const UNUSED_TYPES = [
  'src/types/analytics.ts', // Not used
  'src/types/booking.ts', // Not used
  'src/types/calendar.ts', // Not used
];

// List of potentially unused constants
export const UNUSED_CONSTANTS = [
  'src/constants/analytics.ts', // Not used
  'src/constants/booking.ts', // Not used
  'src/constants/calendar.ts', // Not used
];

// List of potentially unused content
export const UNUSED_CONTENT = [
  'src/content/short_reads.json', // Not used in current implementation
];

// Function to check if a file is actually used
export function isFileUsed(filePath: string): boolean {
  // This would need to be implemented with a proper AST parser
  // For now, we'll use a simple heuristic
  return !UNUSED_COMPONENTS.includes(filePath) && 
         !UNUSED_PAGES.includes(filePath) && 
         !UNUSED_HOOKS.includes(filePath) && 
         !UNUSED_UTILITIES.includes(filePath) && 
         !UNUSED_TYPES.includes(filePath) && 
         !UNUSED_CONSTANTS.includes(filePath) && 
         !UNUSED_CONTENT.includes(filePath);
}

// Function to get bundle size optimization suggestions
export function getBundleOptimizationSuggestions() {
  return {
    unusedComponents: UNUSED_COMPONENTS.length,
    unusedPages: UNUSED_PAGES.length,
    unusedHooks: UNUSED_HOOKS.length,
    unusedUtilities: UNUSED_UTILITIES.length,
    unusedTypes: UNUSED_TYPES.length,
    unusedConstants: UNUSED_CONSTANTS.length,
    unusedContent: UNUSED_CONTENT.length,
    totalUnusedFiles: UNUSED_COMPONENTS.length + UNUSED_PAGES.length + UNUSED_HOOKS.length + 
                      UNUSED_UTILITIES.length + UNUSED_TYPES.length + UNUSED_CONSTANTS.length + 
                      UNUSED_CONTENT.length
  };
}

// Function to get import optimization suggestions
export function getImportOptimizationSuggestions() {
  return {
    // Use dynamic imports for heavy components
    dynamicImports: [
      'src/components/admin/EnhancedProgramCreator.tsx',
      'src/components/admin/SupportChatDashboard.tsx',
      'src/components/analytics/EnhancedProgressChart.tsx',
      'src/components/smart-progression/SmartProgressDashboard.tsx',
      'src/components/workout/VideoPlayer.tsx',
      'src/components/workout/VideoModal.tsx',
    ],
    // Use tree shaking for lucide-react icons
    treeShaking: [
      'lucide-react', // Only import specific icons
      'react-router-dom', // Only import used components
      'supabase', // Only import used functions
    ],
    // Use code splitting for large pages
    codeSplitting: [
      'src/pages/admin/AdminDashboard.tsx',
      'src/pages/admin/Analytics.tsx',
      'src/pages/admin/PersonalTraining.tsx',
      'src/pages/PersonalTrainingStats.tsx',
      'src/pages/calculators/CalculatorsPage.tsx',
    ]
  };
}

// Function to get bundle size estimates
export function getBundleSizeEstimates() {
  return {
    currentEstimatedSize: '~2.5MB', // Estimated current bundle size
    optimizedSize: '~1.8MB', // Estimated size after optimization
    savings: '~700KB', // Estimated savings
    savingsPercentage: '~28%' // Estimated percentage savings
  };
}

// Function to generate optimization report
export function generateOptimizationReport() {
  const suggestions = getBundleOptimizationSuggestions();
  const importSuggestions = getImportOptimizationSuggestions();
  const sizeEstimates = getBundleSizeEstimates();
  
  return {
    summary: {
      totalUnusedFiles: suggestions.totalUnusedFiles,
      estimatedSavings: sizeEstimates.savings,
      estimatedSavingsPercentage: sizeEstimates.savingsPercentage
    },
    unusedFiles: {
      components: UNUSED_COMPONENTS,
      pages: UNUSED_PAGES,
      hooks: UNUSED_HOOKS,
      utilities: UNUSED_UTILITIES,
      types: UNUSED_TYPES,
      constants: UNUSED_CONSTANTS,
      content: UNUSED_CONTENT
    },
    importOptimizations: importSuggestions,
    sizeEstimates
  };
}
