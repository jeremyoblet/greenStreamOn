import { getUIElements } from "./ui";
import {
  getSettingsFromBackground,
  updateSettings,
  notifyTabsQualityChanged,
} from "./messaging";
import { VideoQuality } from "../types";
import { getLevelInfo } from "../data/levels";

// ADEME network value: 18 gCO2e/Go = 0.018 gCO2e/Mo (fixed network average)
const CO2_PER_MO = 0.018;

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const ui = getUIElements();
  const bandwidthDisplay = document.getElementById("bandwidthSaved") as HTMLSpanElement;
  const co2Display = document.getElementById("co2Saved") as HTMLSpanElement;
  const hiddenTimeDisplay = document.getElementById("hiddenPlayTime") as HTMLSpanElement;
  const currentLevelDisplay = document.getElementById("currentLevel") as HTMLSpanElement;
  const progressFill = document.getElementById("progressFill") as HTMLDivElement;
  const progressCurrent = document.getElementById("progressCurrent") as HTMLSpanElement;
  const progressGoal = document.getElementById("progressGoal") as HTMLSpanElement;

  async function loadBandwidthSaved() {
    chrome.runtime.sendMessage({ type: "getBandwidthSaved" }, (response) => {
      if (response?.bandwidthSaved !== undefined) {
        updateBandwidthDisplays(response.bandwidthSaved);
      }
    });
  }

  async function loadHiddenPlayTime() {
    chrome.runtime.sendMessage({ type: "getHiddenPlayTime" }, (response) => {
      if (response?.hiddenPlayTime !== undefined) {
        updateHiddenTimeDisplay(response.hiddenPlayTime);
      }
    });
  }

  function updateBandwidthDisplays(megabytes: number) {
    bandwidthDisplay.textContent = megabytes.toFixed(2);
    const co2Saved = megabytes * CO2_PER_MO;
    co2Display.textContent = co2Saved.toFixed(2);
    updateLevelProgress(megabytes);
  }

  function updateLevelProgress(megabytes: number) {
    const levelInfo = getLevelInfo(megabytes);
    currentLevelDisplay.textContent = levelInfo.currentLevel.toString();
    progressCurrent.textContent = levelInfo.progressInLevel.toFixed(2);
    progressGoal.textContent = levelInfo.goalForLevel.toString();

    const percentage = (levelInfo.progressInLevel / levelInfo.goalForLevel) * 100;
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
  }

  function updateHiddenTimeDisplay(seconds: number) {
    hiddenTimeDisplay.textContent = formatTime(seconds);
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
        updateBandwidthDisplays(changes.bandwidthSaved.newValue);
      }
      if (changes.hiddenPlayTime !== undefined) {
        updateHiddenTimeDisplay(changes.hiddenPlayTime.newValue);
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
  await loadHiddenPlayTime();
  addListeners();
  listenForStorageChanges();
});
