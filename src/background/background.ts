import { handlePopupMessage } from "./handlers/popupHandlers";
import { handleContentMessage } from "./handlers/contentHandlers";
import { StorageHandler } from "./handlers/storageHandler";

const storage = new StorageHandler();

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installée et paramètres initialisés");
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-extension") {
    const settings = await storage.readMultipleSettings();
    const newEnabled = !settings.extensionEnabled;
    await storage.writeMultipleSettings({ extensionEnabled: newEnabled });
    console.log(`[background] Extension toggled: ${newEnabled ? "enabled" : "disabled"}`);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension démarrée");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const handledByPopup = await handlePopupMessage(
      message,
      sender,
      sendResponse
    );
    if (handledByPopup) return;

    const handledByContent = await handleContentMessage(
      message,
      sender,
      sendResponse
    );
    if (handledByContent) return;
  })();

  return true;
});
