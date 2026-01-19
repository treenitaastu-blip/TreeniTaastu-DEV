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
 * Previously unlocked days remain accessible on weekends and weekdays
 */
export function shouldUnlockDay(dayNumber: number, userStartDate?: Date, isCompleted?: boolean): boolean {
  const tallinnDate = getTallinnDate();
  
  // Calculate how many weekdays have passed since program start
  const startDate = userStartDate || getCurrentWeekStart();
  
  // Properly count weekdays by iterating through each day and counting only Mon-Fri
  let weekdaysSinceStart = 0;
  let currentDate = new Date(startDate);
  const todayDate = new Date(tallinnDate);
  
  // Set both dates to midnight for accurate day comparison
  currentDate.setHours(0, 0, 0, 0);
  todayDate.setHours(0, 0, 0, 0);
  
  // Count weekdays from start date up to (but not including) today
  while (currentDate < todayDate) {
    if (!isWeekend(currentDate)) {
      weekdaysSinceStart++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Completed days should always be unlocked (even on weekends)
  if (isCompleted) {
    return true;
  }
  
  // On weekends: allow access to previously unlocked days, but don't unlock new days
  // Previously unlocked days are accessible (no +1, no 07:00 check)
  // A day is "previously unlocked" if it was unlocked by the end of Friday
  if (isWeekend(tallinnDate)) {
    // On weekends, we check if the day was unlocked by the end of the previous week
    // If we're on Saturday/Sunday, we've had 5 weekdays this week (Mon-Fri)
    // So dayNumber should be <= weekdaysSinceStart (which includes all weekdays up to Friday)
    return dayNumber <= weekdaysSinceStart;
  }
  
  // On weekdays: check unlock logic
  // Today is a weekday, so we need to consider if today counts toward unlocking
  
  // Calculate how many weekdays we've had including today (if today is a weekday)
  // This represents which program day should be available today
  const weekdaysIncludingToday = weekdaysSinceStart + 1; // +1 for today (weekday)
  
  // Previously unlocked days (from earlier days): stay unlocked (no 07:00 check needed)
  // A day is "previously unlocked" if we've already had enough weekdays to unlock it
  const isPreviouslyUnlocked = dayNumber < weekdaysIncludingToday;
  if (isPreviouslyUnlocked) {
    return true;
  }
  
  // New days: check if today is the right weekday AND it's after 07:00
  // dayNumber should unlock when we're on the Nth weekday, so dayNumber === weekdaysIncludingToday
  const isTodayTheRightDay = dayNumber === weekdaysIncludingToday;
  const isAfterUnlock = isAfterUnlockTime();
  return isTodayTheRightDay && isAfterUnlock;
  
  return result;
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
