import { Settings, VideoQuality } from "../../types";
import { checkIfUserIsPremium } from "../ui/checkPremiumStatus";
import { BandwidthTracker } from "./bandwidthTracker";
import { extractResolutionNumber } from "./bitrateMapping";

/** TODO
 * quand on ouvre le popup, regarder si on est premium ou pas
 *     si premium, charger les qualites  dans le settings popup
 *     sinon charger uniquement les qualites standard dans le settings popup
 *
 *  quand on change la qualite de la video
 *      si premium, mettre uniquement la qualite
 *      sinonm filtrer les qualites premium dans le menu settings du player
 */

export class QualitySwitcher {
  private readonly MENU_SELECTOR = ".ytp-settings-menu";
  private readonly TRANSPARENT_CLASS = "gso-menu-hidden";
  private isChangingQuality = false;
  private wasPlayingBeforeHidden = false;
  private bandwidthTracker = new BandwidthTracker();

  private injectStyles(): void {
    if (document.getElementById("gso-styles")) return;
    const style = document.createElement("style");
    style.id = "gso-styles";
    style.textContent = `
      .${this.TRANSPARENT_CLASS} {
        opacity: 0 !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  private hideMenu(): void {
    this.injectStyles();
    const menu = document.querySelector(this.MENU_SELECTOR);
    if (menu) {
      menu.classList.add(this.TRANSPARENT_CLASS);
    }
  }

  private showMenu(): void {
    const menu = document.querySelector(this.MENU_SELECTOR);
    if (menu) {
      menu.classList.remove(this.TRANSPARENT_CLASS);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getVideoElement(): HTMLVideoElement | null {
    return document.querySelector("video") as HTMLVideoElement | null;
  }

  private pauseVideo(): void {
    const video = this.getVideoElement();
    if (video && !video.paused) {
      video.pause();
      console.log("[qualitySwitcher] Video paused (pause mode).");
    }
  }

  private playVideo(): void {
    const video = this.getVideoElement();
    if (video && video.paused) {
      video.play();
      console.log("[qualitySwitcher] Video resumed (pause mode).");
    }
  }

  async handleVisibilityChange(): Promise<void> {
    // Always close the settings menu immediately when tab becomes hidden
    if (document.hidden) {
      this.forceCloseSettingsMenu();
    }

    // Prevent concurrent quality changes
    if (this.isChangingQuality) {
      console.log("[qualitySwitcher] Quality change already in progress, skipping.");
      return;
    }

    try {
      const storedSettings = await this.getQualitiesFromBackground();
      if (!storedSettings || !storedSettings.extensionEnabled) {
        console.log("[qualitySwitcher] Extension disabled by user.");
        return;
      }

      // Handle pause mode when tab becomes hidden
      if (storedSettings.pauseModeEnabled && document.hidden) {
        // Tab is now hidden - remember if video was playing and pause it
        this.wasPlayingBeforeHidden = !this.isVideoPaused();
        if (this.wasPlayingBeforeHidden) {
          this.pauseVideo();
        }
        return; // Don't change quality when pausing
      }

      // Handle pause mode when tab becomes visible - resume video if needed
      if (storedSettings.pauseModeEnabled && !document.hidden && this.wasPlayingBeforeHidden) {
        this.playVideo();
        this.wasPlayingBeforeHidden = false;
        // Continue to change quality back to visibleQuality
      }

      const isPaused = this.isVideoPaused();
      if (isPaused) {
        console.log("[qualitySwitcher] Video is paused, no quality changing performed.");
        return;
      }

      const { visibleQuality, hiddenQuality } = storedSettings;
      const targetQuality = document.hidden ? hiddenQuality : visibleQuality;

      // Always track bandwidth savings (both hidden and visible at lower quality)
      this.bandwidthTracker.start();

      console.log(`[qualitySwitcher] Quality applied : ${targetQuality}`);

      // Close any open menu and wait for it to close
      this.forceCloseSettingsMenu();
      await this.delay(300);

      await this.setPlayerQuality(targetQuality);
    } catch (error) {
      console.error("[qualitySwitcher] Error when quality changing :", error);
    }
  }

  isVideoPaused(): boolean {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    return video ? video.paused : true;
  }

  async getQualitiesFromBackground(): Promise<Settings | null> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "getSettings" }, (response) => {
          if (chrome.runtime.lastError || !response?.settings) {
            console.warn(
              "[qualitySwitcher] Impossible to get settings from storage :",
              chrome.runtime.lastError
            );
            resolve(null);
          } else {
            resolve(response.settings);
          }
        });
      } catch (err) {
        console.error(
          "[qualitySwitcher] Erreur inattendue lors du message vers le background :",
          err
        );
        resolve(null);
      }
    });
  }

  private isQualityOption(el: Element): boolean {
    const text = el.textContent?.trim() || "";
    return /^\d{3,4}p/.test(text) || /^auto/i.test(text);
  }

  async setPlayerQuality(targetQuality: VideoQuality): Promise<void> {
    const settingsButton = document.querySelector(".ytp-settings-button") as HTMLElement | null;
    if (!settingsButton) {
      console.log("[qualitySwitcher] Settings button not found.");
      return;
    }

    this.isChangingQuality = true;

    try {
      await this.openSettingsMenu(settingsButton);
      await this.selectQuality(targetQuality, (finalQuality) => {
        this.notifyQualityChange(finalQuality);
      });
    } catch (err) {
      console.warn("[qualitySwitcher] Quality change failed:", err);
      this.forceCloseSettingsMenu();
    } finally {
      this.isChangingQuality = false;
    }
  }

  async openSettingsMenu(button: HTMLElement): Promise<void> {
    this.injectStyles();
    button.click();
    this.hideMenu();

    const qualityItem = await this.waitForElement(
      ".ytp-menuitem-label",
      10000,
      (el) => el.textContent?.toLowerCase().includes("qualit") ?? false
    );

    if (qualityItem instanceof HTMLElement) {
      qualityItem.click();
      this.hideMenu();
      // Wait for quality options to appear before returning
      await this.waitForElement(
        ".ytp-menuitem-label",
        5000,
        (el) => this.isQualityOption(el)
      );
    } else {
      throw new Error("Quality menu item not found");
    }
  }

  async waitForElement(selector: string, timeout: number = 2000, validateFn?: (el: Element) => boolean): Promise<Element> {
    return new Promise((resolve, reject) => {
      const tryMatch = () => {
        const candidates = Array.from(document.querySelectorAll(selector));
        for (const el of candidates) {
          if (!validateFn || validateFn(el)) return el;
        }
        return null;
      };

      const existing = tryMatch();
      if (existing) return resolve(existing);

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(
          `⏱ Timeout: element '${selector}' not found after ${timeout}ms`
        );
      }, timeout);

      const observer = new MutationObserver(() => {
        const match = tryMatch();
        if (match) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(match);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  extractResolution(text: string): number | null {
    const match = text.match(/(\d+)p/);
    return match ? parseInt(match[1], 10) : null;
  }

  isPlainResolution(label: string): boolean {
    return /^[0-9]+p$/i.test(label.trim());
  }

  isPremium(label: string): boolean {
    return /premium/i.test(label);
  }

  async selectQuality(targetQuality: VideoQuality, callback: (finalQuality: string) => void): Promise<void> {
    try {
      const isPremiumUser = await checkIfUserIsPremium();
      console.log(`isPremiumUser: ${isPremiumUser}`);
      const allLabels = document.querySelectorAll(".ytp-menuitem-label");
      const qualities = Array.from(allLabels).filter((el) => this.isQualityOption(el));
      if (qualities.length === 0) {
        console.warn("[qualitySwitcher] No quality found.");
        return;
      }

      const qualityList = qualities
        .map((q) => {
          const label = q.textContent?.trim() || "";
          return {
            element: q as HTMLElement,
            label,
            resolution: this.extractResolution(label),
            isPlain: this.isPlainResolution(label),
            isPremium: this.isPremium(label),
          };
        })
        .filter((q) => isPremiumUser || !q.isPremium);

      // Find max available quality (highest resolution, excluding "Auto")
      const maxQuality = qualityList
        .filter((q) => q.resolution !== null)
        .sort((a, b) => b.resolution! - a.resolution!)[0];
      if (maxQuality) {
        this.bandwidthTracker.setMaxAvailableQuality(maxQuality.label);
      }

      let finalQuality: string = targetQuality;

      if (targetQuality.toLowerCase() === "auto") {
        const auto = qualityList.find((q) =>
          q.label.toLowerCase().includes("auto")
        );
        if (auto) {
          auto.element.click();
          finalQuality = auto.label;
        }
      } else {
        const targetRes = parseInt(targetQuality, 10);
        let match =
          qualityList.find((q) => q.resolution === targetRes && q.isPlain) ||
          qualityList.find((q) => q.resolution === targetRes);

        if (match) {
          match.element.click();
          finalQuality = match.label;
        } else {
          const fallback =
            qualityList
              .filter((q) => q.resolution !== null && q.resolution! < targetRes)
              .sort((a, b) => b.resolution! - a.resolution!)[0] ||
            qualityList[qualityList.length - 1];

          if (fallback) {
            fallback.element.click();
            finalQuality = fallback.label;
          }
        }
      }

      console.log(`[qualitySwitcher] Selected quality : ${finalQuality}`);
      this.bandwidthTracker.setCurrentQuality(finalQuality);
      callback(finalQuality);
    } catch (error) {
      console.error("[qualitySwitcher] Error when quality selection :", error);
    }
    setTimeout(() => {
      this.forceCloseSettingsMenu();
    }, 500);
  }

  forceCloseSettingsMenu(): void {
    const menuSettings = document.querySelector(this.MENU_SELECTOR);
    const buttonSettings = document.querySelector(".ytp-settings-button") as HTMLElement | null;

    if (menuSettings && menuSettings instanceof HTMLElement && menuSettings.offsetParent !== null && buttonSettings) {
      buttonSettings.click();
      console.log("[qualitySwitcher] Settings menu closed manually.");
    }
    this.showMenu();
  }

  notifyQualityChange(finalQuality: string): void {
    chrome.runtime.sendMessage({
      type: "qualityChanged",
      quality: finalQuality,
      visibility: document.visibilityState === "visible" ? "visible" : "hidden",
      tabInfo: { title: document.title },
    });
  }
}
