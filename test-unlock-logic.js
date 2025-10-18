// Test the unlock logic
const { getTallinnDate, isAfterUnlockTime, shouldUnlockDay, formatTimeUntilUnlock } = require('./src/lib/workweek.ts');

console.log('Current Tallinn time:', getTallinnDate());
console.log('Is after unlock time (15:00):', isAfterUnlockTime());
console.log('Time until unlock:', formatTimeUntilUnlock());
console.log('Should unlock day 1:', shouldUnlockDay(1));
console.log('Should unlock day 5:', shouldUnlockDay(5));
