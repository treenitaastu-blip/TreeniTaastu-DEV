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

/**
 * Check if it's after 07:00 Estonia time (unlock time for new days)
 */
export function isAfterUnlockTime(): boolean {
  const tallinnDate = getTallinnDate();
  const currentHour = tallinnDate.getHours();
  return currentHour >= 7; // 07:00 Estonia time
}

/**
 * Check if a specific day should be unlocked based on 07:00 Estonia time rule
 * New weekdays unlock after 07:00 Estonia time
 */
export function shouldUnlockDay(dayNumber: number, userStartDate?: Date, isCompleted?: boolean): boolean {
  const tallinnDate = getTallinnDate();
  const today = tallinnDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Weekends never unlock new training days
  if (isWeekend(tallinnDate)) {
    return false;
  }
  
  // Calculate how many weekdays have passed since program start
  const startDate = userStartDate || getCurrentWeekStart();
  const daysSinceStart = Math.floor((tallinnDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weekdaysSinceStart = Math.floor(daysSinceStart / 7) * 5 + Math.min(daysSinceStart % 7, 5);
  
  // Completed days should always be unlocked
  if (isCompleted) {
    return true;
  }
  
  // For new days: check if enough weekdays have passed AND it's after 07:00
  const enoughWeekdaysPassed = dayNumber <= weekdaysSinceStart + 1; // +1 because day 1 unlocks on first weekday
  const isAfterUnlock = isAfterUnlockTime();
  
  return enoughWeekdaysPassed && isAfterUnlock;
}

/**
 * Get unlock time for today (07:00 Estonia time)
 */
export function getTodayUnlockTime(): Date {
  const tallinnDate = getTallinnDate();
  const unlockTime = new Date(tallinnDate);
  unlockTime.setHours(7, 0, 0, 0);
  return unlockTime;
}

/**
 * Get time until unlock (in milliseconds)
 */
export function getTimeUntilUnlock(): number {
  const unlockTime = getTodayUnlockTime();
  const now = getTallinnDate();
  const diff = unlockTime.getTime() - now.getTime();
  return Math.max(0, diff);
}

/**
 * Format time until unlock as human readable string
 */
export function formatTimeUntilUnlock(): string {
  const timeUntil = getTimeUntilUnlock();
  if (timeUntil === 0) {
    return "Avaneb nüüd!";
  }
  
  const hours = Math.floor(timeUntil / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `Avaneb ${hours}t ${minutes}min pärast`;
  } else {
    return `Avaneb ${minutes}min pärast`;
  }
}
