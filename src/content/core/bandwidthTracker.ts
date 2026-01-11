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
    if (!this.isVideoPlaying()) {
      this.lastTrackTime = Date.now();
      return;
    }

    if (!this.currentQuality || !this.maxAvailableQuality) {
      this.lastTrackTime = Date.now();
      return;
    }

    const currentBitrate = getBitrateForQuality(this.currentQuality);
    const maxAvailableBitrate = getBitrateForQuality(this.maxAvailableQuality);

    // When visible: use 1080p as reference (or max available if lower)
    // When hidden: use max available quality as reference
    let referenceBitrate: number;
    if (document.hidden) {
      referenceBitrate = maxAvailableBitrate;
    } else {
      referenceBitrate = Math.min(BITRATE_1080P, maxAvailableBitrate);
    }

    if (currentBitrate >= referenceBitrate) {
      this.lastTrackTime = Date.now();
      return;
    }

    const now = Date.now();
    const elapsedSeconds = (now - this.lastTrackTime) / 1000;
    this.lastTrackTime = now;

    // Calculate saved bandwidth in megabytes
    // bitrate is in Mbps (megabits per second)
    // saved = (referenceBitrate - currentBitrate) * elapsedSeconds / 8 (convert bits to bytes)
    const savedMegabytes = ((referenceBitrate - currentBitrate) * elapsedSeconds) / 8;

    if (savedMegabytes > 0) {
      this.sendSavingsToBackground(savedMegabytes);
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
}
