import { getUIElements } from "./ui";
import {
  getSettingsFromBackground,
  updateSettings,
  notifyTabsQualityChanged,
} from "./messaging";
import { VideoQuality } from "../types";

document.addEventListener("DOMContentLoaded", async () => {
  const ui = getUIElements();
  const bandwidthDisplay = document.getElementById("bandwidthSaved") as HTMLSpanElement;

  async function loadBandwidthSaved() {
    chrome.runtime.sendMessage({ type: "getBandwidthSaved" }, (response) => {
      if (response?.bandwidthSaved !== undefined) {
        updateBandwidthDisplay(response.bandwidthSaved);
      }
    });
  }

  function updateBandwidthDisplay(megabytes: number) {
    bandwidthDisplay.textContent = megabytes.toFixed(2);
  }

  async function applySettingsToUI() {
    const settings = await getSettingsFromBackground();
    ui.extensionCheckbox.checked = settings.extensionEnabled;
    ui.visibleSelect.value = settings.visibleQuality;
    ui.hiddenSelect.value = settings.hiddenQuality;
    ui.notificationsCheckbox.checked = settings.notificationsEnabled;
    ui.pauseModeCheckbox.checked = settings.pauseModeEnabled;
  }

  function getAllSettingsFromUI() {
    return {
      extensionEnabled: ui.extensionCheckbox.checked,
      visibleQuality: ui.visibleSelect.value as VideoQuality,
      hiddenQuality: ui.hiddenSelect.value as VideoQuality,
      notificationsEnabled: ui.notificationsCheckbox.checked,
      pauseModeEnabled: ui.pauseModeCheckbox.checked,
    };
  }

  async function updateAllSettingsFromUI() {
    const newSettings = getAllSettingsFromUI();
    const response = await updateSettings(newSettings);
    console.log("Tous les réglages mis à jour ?", response.success);
  }

  function listenForStorageChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") return;
      if (changes.extensionEnabled !== undefined) {
        ui.extensionCheckbox.checked = changes.extensionEnabled.newValue;
      }
      if (changes.bandwidthSaved !== undefined) {
        updateBandwidthDisplay(changes.bandwidthSaved.newValue);
      }
    });
  }

  function addListeners() {
    ui.extensionCheckbox.addEventListener("change", async () => {
      await updateAllSettingsFromUI();
    });

    ui.visibleSelect.addEventListener("change", async () => {
      await updateAllSettingsFromUI();
      notifyTabsQualityChanged();
    });

    ui.hiddenSelect.addEventListener("change", async () => {
      await updateAllSettingsFromUI();
      // notifyTabsQualityChanged();
    });

    ui.notificationsCheckbox.addEventListener("change", async () => {
      await updateAllSettingsFromUI();
    });

    ui.pauseModeCheckbox.addEventListener("change", async () => {
      await updateAllSettingsFromUI();
    });
  }

  await applySettingsToUI();
  await loadBandwidthSaved();
  addListeners();
  listenForStorageChanges();
});
