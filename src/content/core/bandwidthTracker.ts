import { getBitrateForQuality } from "./bitrateMapping";

const REFERENCE_QUALITY_1080P = "1080p";
const BITRATE_1080P = getBitrateForQuality(REFERENCE_QUALITY_1080P);

export class BandwidthTracker {
  private trackingInterval: number | null = null;
  private lastTrackTime: number = 0;
  private currentQuality: string | null = null;
  private maxAvailableQuality: string | null = null;
  private readonly TRACK_INTERVAL_MS = 5000;

  start(): void {
    if (this.trackingInterval) return;

    this.lastTrackTime = Date.now();
    this.trackingInterval = window.setInterval(() => {
      this.trackSavings();
    }, this.TRACK_INTERVAL_MS);

    console.log("[bandwidthTracker] Started tracking");
  }

  stop(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      console.log("[bandwidthTracker] Stopped tracking");
    }
  }

  setCurrentQuality(quality: string): void {
    this.currentQuality = quality;
    console.log(`[bandwidthTracker] Current quality set to: ${quality}`);
  }

  setMaxAvailableQuality(quality: string): void {
    this.maxAvailableQuality = quality;
    console.log(`[bandwidthTracker] Max available quality set to: ${quality}`);
  }

  private getVideoElement(): HTMLVideoElement | null {
    return document.querySelector("video") as HTMLVideoElement | null;
  }

  private isVideoPlaying(): boolean {
    const video = this.getVideoElement();
    return video ? !video.paused && !video.ended : false;
  }

  private trackSavings(): void {
    const now = Date.now();

    if (!this.isVideoPlaying()) {
      this.lastTrackTime = now;
      return;
    }

    if (!this.currentQuality) {
      this.lastTrackTime = now;
      return;
    }

    const currentBitrate = getBitrateForQuality(this.currentQuality);

    // Reference is always 1080p - we count savings when playing below 1080p
    // When hidden and maxAvailable is set: use max available if higher than 1080p
    let referenceBitrate: number = BITRATE_1080P;
    if (document.hidden && this.maxAvailableQuality) {
      const maxAvailableBitrate = getBitrateForQuality(this.maxAvailableQuality);
      referenceBitrate = Math.max(BITRATE_1080P, maxAvailableBitrate);
    }

    if (currentBitrate >= referenceBitrate) {
      this.lastTrackTime = now;
      return;
    }

    const elapsedSeconds = (now - this.lastTrackTime) / 1000;
    this.lastTrackTime = now;

    // Calculate saved bandwidth in megabytes
    // bitrate is in Mbps (megabits per second)
    // saved = (referenceBitrate - currentBitrate) * elapsedSeconds / 8 (convert bits to bytes)
    const savedMegabytes = ((referenceBitrate - currentBitrate) * elapsedSeconds) / 8;

    if (savedMegabytes > 0) {
      this.sendSavingsToBackground(savedMegabytes);
    }

    // Track eco play time - same interval as bandwidth
    if (elapsedSeconds > 0) {
      this.sendEcoTimeToBackground(elapsedSeconds);
    }
  }

  private sendSavingsToBackground(megabytes: number): void {
    chrome.runtime.sendMessage(
      { type: "addBandwidthSaved", megabytes },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[bandwidthTracker] Failed to send savings:", chrome.runtime.lastError);
        }
      }
    );
  }

  private sendEcoTimeToBackground(seconds: number): void {
    chrome.runtime.sendMessage(
      { type: "addEcoPlayTime", seconds },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[bandwidthTracker] Failed to send eco time:", chrome.runtime.lastError);
        }
      }
    );
  }
}
