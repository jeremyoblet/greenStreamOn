import { getUIElements } from "./ui";
import {
  getSettingsFromBackground,
  updateSettings,
  notifyTabsQualityChanged,
} from "./messaging";
import { VideoQuality } from "../types";
import { getLevelInfo } from "../data/levels";

// API configuration
const API_BASE_URL = "http://localhost:8000";

// User session type
type UserSession = {
  username: string;
  avatarUrl: string;
  level: number;
  levelTitle: string;
  bandwidthSaved: number;
  ecoPlayTime: number;
  co2Saved: number;
  accessToken: string;
  refreshToken: string;
};

// API response type
type LoginResponse = {
  username: string;
  avatar_url?: string;
  stats: {
    level: number;
    eco_play_time_seconds: number;
    total_play_time_seconds: number;
    bandwidth_saved_bytes: number;
    co2_saved_grams: number;
  };
  access_token: string;
  refresh_token: string;
};

// Storage key for user session
const USER_SESSION_KEY = "userSession";

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
  const ecoTimeDisplay = document.getElementById("ecoPlayTime") as HTMLSpanElement;
  const levelTitleDisplay = document.getElementById("levelTitle") as HTMLSpanElement;
  const progressFill = document.getElementById("progressFill") as HTMLDivElement;
  const progressCurrent = document.getElementById("progressCurrent") as HTMLSpanElement;
  const progressGoal = document.getElementById("progressGoal") as HTMLSpanElement;

  // Login/Profile elements
  const loginFormContainer = document.getElementById("loginFormContainer") as HTMLDivElement;
  const userProfileContainer = document.getElementById("userProfileContainer") as HTMLDivElement;
  const loginEmail = document.getElementById("loginEmail") as HTMLInputElement;
  const loginPassword = document.getElementById("loginPassword") as HTMLInputElement;
  const loginButton = document.getElementById("loginButton") as HTMLButtonElement;
  const loginError = document.getElementById("loginError") as HTMLDivElement;
  const logoutButton = document.getElementById("logoutButton") as HTMLButtonElement;
  const userAvatar = document.getElementById("userAvatar") as HTMLImageElement;
  const userName = document.getElementById("userName") as HTMLSpanElement;
  const userLevelText = document.getElementById("userLevelText") as HTMLSpanElement;
  const avatarLevelBadge = document.getElementById("avatarLevelBadge") as HTMLDivElement;
  const profileBandwidth = document.getElementById("profileBandwidth") as HTMLSpanElement;
  const profileLevel = document.getElementById("profileLevel") as HTMLSpanElement;

  async function loadBandwidthSaved() {
    chrome.runtime.sendMessage({ type: "getBandwidthSaved" }, (response) => {
      if (response?.bandwidthSaved !== undefined) {
        updateBandwidthDisplays(response.bandwidthSaved);
      }
    });
  }

  async function loadEcoPlayTime() {
    chrome.runtime.sendMessage({ type: "getEcoPlayTime" }, (response) => {
      if (response?.ecoPlayTime !== undefined) {
        updateEcoTimeDisplay(response.ecoPlayTime);
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
    levelTitleDisplay.textContent = levelInfo.title;
    progressCurrent.textContent = levelInfo.progressInLevel.toFixed(2);
    progressGoal.textContent = levelInfo.goalForLevel.toString();

    const percentage = (levelInfo.progressInLevel / levelInfo.goalForLevel) * 100;
    progressFill.style.width = `${Math.min(percentage, 100)}%`;
  }

  function updateEcoTimeDisplay(seconds: number) {
    ecoTimeDisplay.textContent = formatTime(seconds);
  }

  // Authentication functions
  async function getUserSession(): Promise<UserSession | null> {
    return new Promise((resolve) => {
      chrome.storage.sync.get([USER_SESSION_KEY], (result) => {
        resolve(result[USER_SESSION_KEY] || null);
      });
    });
  }

  async function saveUserSession(session: UserSession): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [USER_SESSION_KEY]: session }, () => {
        resolve();
      });
    });
  }

  async function clearUserSession(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.remove([USER_SESSION_KEY], () => {
        resolve();
      });
    });
  }

  function showLoginForm() {
    loginFormContainer.style.display = "block";
    userProfileContainer.style.display = "none";
    loginError.textContent = "";
    loginEmail.value = "";
    loginPassword.value = "";
  }

  function showUserProfile(session: UserSession) {
    loginFormContainer.style.display = "none";
    userProfileContainer.style.display = "block";

    userName.textContent = session.username;
    userLevelText.textContent = session.levelTitle;
    avatarLevelBadge.textContent = session.level.toString();
    profileBandwidth.textContent = session.bandwidthSaved.toFixed(2);
    profileLevel.textContent = session.level.toString();

    // Set avatar with fallback
    if (session.avatarUrl) {
      userAvatar.src = session.avatarUrl;
    } else {
      // Generate a default avatar using initials
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.username)}&background=4caf50&color=1b1b1b&bold=true&size=70`;
    }
  }

  async function handleLogin() {
    const login = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!login || !password) {
      loginError.textContent = "Please enter email and password";
      return;
    }

    // Disable button during login
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    loginError.textContent = "";

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          loginError.textContent = "Invalid email or password";
        } else {
          loginError.textContent = "Login failed. Please try again.";
        }
        return;
      }

      const data: LoginResponse = await response.json();

      // Convert bytes to Mo (megabytes)
      const bandwidthSavedMo = data.stats.bandwidth_saved_bytes / (1024 * 1024);
      const levelInfo = getLevelInfo(bandwidthSavedMo);

      const session: UserSession = {
        username: data.username,
        avatarUrl: data.avatar_url || "",
        level: data.stats.level,
        levelTitle: levelInfo.title,
        bandwidthSaved: bandwidthSavedMo,
        ecoPlayTime: data.stats.eco_play_time_seconds,
        co2Saved: data.stats.co2_saved_grams,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };

      await saveUserSession(session);
      showUserProfile(session);
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "Connection error. Is the server running?";
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  }

  async function handleLogout() {
    await clearUserSession();
    showLoginForm();
  }

  async function checkAuthState() {
    const session = await getUserSession();
    if (session) {
      showUserProfile(session);
    } else {
      showLoginForm();
    }
  }

  function setupAuthListeners() {
    loginButton.addEventListener("click", handleLogin);

    // Allow login with Enter key
    loginPassword.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleLogin();
      }
    });

    loginEmail.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        loginPassword.focus();
      }
    });

    logoutButton.addEventListener("click", handleLogout);
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
      if (changes.ecoPlayTime !== undefined) {
        updateEcoTimeDisplay(changes.ecoPlayTime.newValue);
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

  function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.getAttribute("data-tab");

        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        button.classList.add("active");
        document.getElementById(`tab-${tabName}`)?.classList.add("active");
      });
    });
  }

  await applySettingsToUI();
  await loadBandwidthSaved();
  await loadEcoPlayTime();
  addListeners();
  listenForStorageChanges();
  setupTabs();
  setupAuthListeners();
  await checkAuthState();
});
