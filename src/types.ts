export type VideoQuality =
  | "Auto"
  | "144"
  | "240"
  | "360"
  | "480"
  | "720"
  | "1080"
  | "1080hdPremium"
  | "1440"
  | "1440hdPremium"
  | "2160"
  | "2160hdPremium"
  | "4320"
  | "4320hdPremium";

export type Settings = {
  extensionEnabled: boolean;
  visibleQuality: VideoQuality;
  hiddenQuality: VideoQuality;
  notificationsEnabled: boolean;
  pauseModeEnabled: boolean;
};

export type PopupUISettings = {
  extensionCheckbox: HTMLInputElement;
  visibleSelect: HTMLSelectElement;
  hiddenSelect: HTMLSelectElement;
  notificationsCheckbox: HTMLInputElement;
  pauseModeCheckbox: HTMLInputElement;
};

export type MessageResponse = { success: boolean };

export type Message =
  | { type: "getSettings" }
  | { type: "updateSettings"; settings: Partial<Settings> }
  | {
      type: "qualityChanged";
      quality: string;
      visibility: "visible" | "hidden";
    }
  | { type: "notifyTabsQualityChanged" }
  | { type: "addBandwidthSaved"; megabytes: number }
  | { type: "getBandwidthSaved" }
  | { type: "addHiddenPlayTime"; seconds: number }
  | { type: "getHiddenPlayTime" };
