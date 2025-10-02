// Workweek utilities for Europe/Tallinn timezone
// Program works Mon-Fri, weekends are rest days

/**
 * Get current date in Europe/Tallinn timezone
 */
export function getTallinnDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Tallinn" }));
}

/**
 * Get date key in YYYY-MM-DD format for Tallinn timezone
 */
export function dateKeyTallinn(date: Date = getTallinnDate()): string {
  const tallinnDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Tallinn" }));
  return `${tallinnDate.getFullYear()}-${String(tallinnDate.getMonth() + 1).padStart(2, "0")}-${String(tallinnDate.getDate()).padStart(2, "0")}`;
}

/**
 * Check if date is a weekend (Saturday or Sunday) in Tallinn timezone
 */
export function isWeekend(date: Date = getTallinnDate()): boolean {
  const tallinnDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Tallinn" }));
  const day = tallinnDate.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if date is a program day (Monday-Friday) in Tallinn timezone
 */
export function isProgramDay(date: Date = getTallinnDate()): boolean {
  return !isWeekend(date);
}

/**
 * Check if today is a program day in Tallinn timezone
 */
export function isTodayProgramDay(): boolean {
  return isProgramDay();
}

/**
 * Calculate program streak - only count consecutive workdays (Mon-Fri)
 * Skip weekends when calculating streak
 */
export function calcProgramStreak(completedDates: string[]): number {
  if (!completedDates.length) return 0;

  // Start from today (or last Friday if today is weekend) - use a new Date object
  let currentDate = new Date(getTallinnDate());
  while (isWeekend(currentDate)) {
    currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  }

  // Sort completed dates in descending order (newest first)
  const sortedDates = [...completedDates].sort((a, b) => b.localeCompare(a));

  let streak = 0;

  // Count backward from today (or last Friday if weekend)
  while (true) {
    const checkKey = dateKeyTallinn(currentDate);

    if (sortedDates.includes(checkKey)) {
      streak++;
    } else {
      break; // streak ends at first missing workday
    }

    // Move to previous workday - create new Date object to avoid mutations
    do {
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } while (isWeekend(currentDate));
  }

  return streak;
}

/**
 * Check if new week should unlock (Monday 00:00 Europe/Tallinn)
 */
export function shouldUnlockNewWeek(): boolean {
  const tallinnDate = getTallinnDate();
  return tallinnDate.getDay() === 1; // Monday = 1
}

/**
 * Check if static program is available (starts every Monday)
 * Program is available all week, but starts fresh every Monday
 */
export function isStaticProgramAvailable(): boolean {
  // Program is always available once it has started on Monday
  // This function could be expanded to check for specific start dates if needed
  return true; // Available all days - the Monday logic is handled in the program progression
}

/**
 * Check if it's Monday (program start day) in Tallinn timezone
 */
export function isMondayStart(): boolean {
  const tallinnDate = getTallinnDate();
  return tallinnDate.getDay() === 1; // Monday = 1
}

/**
 * Get the start of current week (Monday) in Tallinn timezone
 */
export function getCurrentWeekStart(): Date {
  const tallinnDate = getTallinnDate();
  const dayOfWeek = tallinnDate.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday (0), go back 6 days to Monday
  
  const monday = new Date(tallinnDate);
  monday.setDate(monday.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0);
  
  return monday;
}
