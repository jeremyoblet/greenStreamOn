export type Level = {
  level: number;
  goal: number; // Mo of bandwidth to save to complete this level
};

export const levels: Level[] = [
  { level: 1, goal: 10 },
  { level: 2, goal: 100 },
  { level: 3, goal: 500 },
  { level: 4, goal: 1000 },
  { level: 5, goal: 10000 },
];

export function getLevelInfo(totalBandwidthSaved: number): {
  currentLevel: number;
  progressInLevel: number;
  goalForLevel: number;
  isMaxLevel: boolean;
} {
  let accumulated = 0;

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (totalBandwidthSaved < accumulated + level.goal) {
      return {
        currentLevel: level.level,
        progressInLevel: totalBandwidthSaved - accumulated,
        goalForLevel: level.goal,
        isMaxLevel: false,
      };
    }
    accumulated += level.goal;
  }

  // Max level reached
  const lastLevel = levels[levels.length - 1];
  return {
    currentLevel: lastLevel.level,
    progressInLevel: lastLevel.goal,
    goalForLevel: lastLevel.goal,
    isMaxLevel: true,
  };
}
