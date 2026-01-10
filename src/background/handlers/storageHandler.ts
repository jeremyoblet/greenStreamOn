import { Settings } from "../../types";

export class StorageHandler {
  async writeMultipleSettings(settings: Partial<Settings>): Promise<void> {
    try {
      await chrome.storage.sync.set(settings);
    } catch (error) {
      console.error("[storageHandler] Error writing multiple settings:", error);
    }
  }

  async readMultipleSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.sync.get(null);
      return {
        extensionEnabled: result.extensionEnabled ?? true,
        visibleQuality: result.visibleQuality ?? "Auto",
        hiddenQuality: result.hiddenQuality ?? "144",
        notificationsEnabled: result.notificationsEnabled ?? true,
        pauseModeEnabled: result.pauseModeEnabled ?? false,
      };
    } catch (error) {
      console.error("[storageHandler] Error reading multiple settings:", error);
      return {
        extensionEnabled: true,
        visibleQuality: "Auto",
        hiddenQuality: "144",
        notificationsEnabled: true,
        pauseModeEnabled: false,
      };
    }
  }

  async initializeDefaultsIfMissing(defaultSettings: Settings): Promise<void> {
    try {
      const storedSettings = await chrome.storage.sync.get(
        Object.keys(defaultSettings)
      );

      const toInitialize: Partial<Settings> = {};
      for (const key in defaultSettings) {
        const settingKey = key as keyof Settings;
        if (storedSettings[key] === undefined) {
          (toInitialize as Record<string, unknown>)[settingKey] =
            defaultSettings[settingKey];
        }
      }

      if (Object.keys(toInitialize).length > 0) {
        await this.writeMultipleSettings(toInitialize);
        console.log("[storageHandler] Default settings added:", toInitialize);
      } else {
        console.log("[storageHandler] Settings already exist:", storedSettings);
      }
    } catch (error) {
      console.error(
        "[storageHandler] Error initializing default settings:",
        error
      );
    }
  }
}
