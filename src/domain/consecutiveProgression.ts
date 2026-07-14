export type HistoricalAttempt = {
  matchedTarget: boolean;
  success: boolean;
};

export function countConsecutiveSuccesses(attempts: HistoricalAttempt[]) {
  let count = 0;

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (!attempt.matchedTarget || !attempt.success) {
      break;
    }
    count += 1;
  }

  return count;
}
