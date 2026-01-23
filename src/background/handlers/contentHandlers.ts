import { StorageHandler } from "./storageHandler";
import { Message } from "../../types";
import { queueNotification } from "./notificationsHandler";

const storage = new StorageHandler();

export async function handleContentMessage(
  message: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<boolean> {
  if (message.type === "qualityChanged") {
    const enabled = await storage
      .readMultipleSettings()
      .then((s) => s.notificationsEnabled);
    if (enabled) {
      queueNotification(message.visibility, message.quality);
    }
    return true;
  }

  if (message.type === "notifyTabsQualityChanged") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url && activeTab.url.includes("youtube.com/watch")) {
        chrome.tabs.sendMessage(activeTab.id!, { type: "refreshQuality" });
      }
    });
    return true;
  }

  if (message.type === "addBandwidthSaved") {
    const result = await chrome.storage.sync.get("bandwidthSaved");
    const currentSaved = result.bandwidthSaved ?? 0;
    const newSaved = currentSaved + message.megabytes;
    await chrome.storage.sync.set({ bandwidthSaved: newSaved });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "getBandwidthSaved") {
    const result = await chrome.storage.sync.get("bandwidthSaved");
    sendResponse({ bandwidthSaved: result.bandwidthSaved ?? 0 });
    return true;
  }

  if (message.type === "addEcoPlayTime") {
    const result = await chrome.storage.sync.get("ecoPlayTime");
    const currentTime = result.ecoPlayTime ?? 0;
    const newTime = currentTime + message.seconds;
    await chrome.storage.sync.set({ ecoPlayTime: newTime });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "getEcoPlayTime") {
    const result = await chrome.storage.sync.get("ecoPlayTime");
    sendResponse({ ecoPlayTime: result.ecoPlayTime ?? 0 });
    return true;
  }

  return false;
}
