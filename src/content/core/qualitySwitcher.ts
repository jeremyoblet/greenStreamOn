import { Settings, VideoQuality } from "../../types";
import { checkIfUserIsPremium } from "../ui/checkPremiumStatus";

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

  async handleVisibilityChange(): Promise<void> {
    try {
      const storedSettings = await this.getQualitiesFromBackground();
      if (!storedSettings || !storedSettings.extensionEnabled) {
        console.log("[qualitySwitcher] Extension disabled by user.");
        return;
      }

      const isPaused = this.isVideoPaused();
      if (isPaused) {
        console.log("[qualitySwitcher] Video is paused, no quality changing performed.");
        return;
      }

      const { visibleQuality, hiddenQuality } = storedSettings;
      const targetQuality = document.hidden ? hiddenQuality : visibleQuality;

      console.log(`[qualitySwitcher] Quality applied : ${targetQuality}`);
      this.forceCloseSettingsMenu();  // garanti que le menu des settings est fermé avant la procedure de changement de qualité
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

  async setPlayerQuality(targetQuality: VideoQuality): Promise<void> {
    const settingsButton = document.querySelector(".ytp-settings-button") as HTMLElement | null;
    if (!settingsButton) {
      console.log("[qualitySwitcher] Settings button not found.");
      return;
    }

    this.openSettingsMenu(settingsButton, async () => {
      try {
        await this.waitForElement(".ytp-quality-menu", 20000);
        await this.selectQuality(targetQuality, (finalQuality) => {
          this.notifyQualityChange(finalQuality);
        });
      } catch (err) {
        console.warn(
          "[qualitySwitcher] Settings menu is not open :",
          err
        );
      }
    });
  }

  async openSettingsMenu(
    button: HTMLElement,
    callback: () => void
  ): Promise<void> {
    button.click();

    try {
      const qualityItem = await this.waitForElement(
        ".ytp-menuitem-label",
        10000,
        (el) => el.textContent?.toLowerCase().includes("qualit") ?? false
      );

      if (qualityItem instanceof HTMLElement) {
        qualityItem.click();
        setTimeout(callback, 500);
      } else {
        console.warn("[qualitySwitcher] Element 'quality' not found.");
        this.forceCloseSettingsMenu();
      }
    } catch (err) {
      console.warn("[qualitySwitcher] Timeout on openSettingsMenu :", err);
      this.forceCloseSettingsMenu();
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
          `⏱ Timeout : element '${selector}' notr found after ${timeout}ms`
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
      const qualities = document.querySelectorAll(".ytp-quality-menu .ytp-menuitem-label");
      if (qualities.length === 0) {
        console.warn("[qualitySwitcher] No quality found.");
        return;
      }

      const qualityList = Array.from(qualities)
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
      callback(finalQuality);
    } catch (error) {
      console.error("[qualitySwitcher] Error when quality selection :", error);
    }
    setTimeout(() => {
      this.forceCloseSettingsMenu();
    }, 500);
  }

  forceCloseSettingsMenu(): void {
    const menuSettings = document.querySelector(".ytp-settings-menu");
    const buttonSettings = document.querySelector(".ytp-settings-button") as HTMLElement | null;

    if (menuSettings && menuSettings instanceof HTMLElement && menuSettings.offsetParent !== null && buttonSettings) {
      buttonSettings.click();
      console.log("[qualitySwitcher] Settings menu closed manually.");
    }
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
