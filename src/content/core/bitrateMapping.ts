// Approximate bitrates in Mbps for each quality level
export const bitrateMap: Record<string, number> = {
  "144": 0.1,
  "240": 0.3,
  "360": 0.7,
  "480": 1.5,
  "720": 3,
  "1080": 6,
  "1440": 13,
  "2160": 25,
  "4320": 50,
};

export function extractResolutionNumber(qualityLabel: string): number | null {
  const match = qualityLabel.match(/(\d+)p?/);
  return match ? parseInt(match[1], 10) : null;
}

export function getBitrateForQuality(qualityLabel: string): number {
  const resolution = extractResolutionNumber(qualityLabel);
  if (resolution === null) return 0;
  return bitrateMap[String(resolution)] ?? 0;
}
