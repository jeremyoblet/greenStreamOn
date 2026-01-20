export type Level = {
  level: number;
  title: string;
  goal: number; // Mo of bandwidth to save to complete this level
};

export const levels: Level[] = [
  { level: 1, title: "Digital Seed", goal: 100 },
  { level: 2, title: "Young Sprout", goal: 300 },
  { level: 3, title: "Leaf Listener", goal: 700 },
  { level: 4, title: "Pixel Forager", goal: 1500 },
  { level: 5, title: "Sobriety Adept", goal: 3000 },
  { level: 6, title: "Data Whisperer", goal: 6000 },
  { level: 7, title: "Guardian of the Green Flow", goal: 10000 },
  { level: 8, title: "Background Druid", goal: 16000 },
  { level: 9, title: "Protector of the Digital Forest", goal: 25000 },
  { level: 10, title: "Master of Gentle Resolutions", goal: 40000 },
  { level: 11, title: "Sage of the Green Bandwidth", goal: 60000 },
  { level: 12, title: "Calm Streaming Shaman", goal: 90000 },
  { level: 13, title: "Watcher of Living Data", goal: 130000 },
  { level: 14, title: "Ancient Flow Druid", goal: 180000 },
  { level: 15, title: "Keeper of Digital Balance", goal: 250000 },
  { level: 16, title: "Archdruid of Sobriety", goal: 350000 },
  { level: 17, title: "Envoy of Responsible Digital", goal: 500000 },
  { level: 18, title: "Spirit of the Digital Forest", goal: 750000 },
  { level: 19, title: "Elder of the Eco Flow", goal: 1100000 },
  { level: 20, title: "Green Legend of Streaming", goal: 1600000 },
];

export function getLevelInfo(totalBandwidthSaved: number): {
  currentLevel: number;
  title: string;
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
        title: level.title,
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
    title: lastLevel.title,
    progressInLevel: lastLevel.goal,
    goalForLevel: lastLevel.goal,
    isMaxLevel: true,
  };
}
