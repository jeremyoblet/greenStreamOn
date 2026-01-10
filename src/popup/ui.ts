import { PopupUISettings } from "../types";

export function getUIElements(): PopupUISettings {
  const extensionCheckbox = document.getElementById(
    "extensionEnabled"
  ) as HTMLInputElement;
  const visibleSelect = document.getElementById(
    "visibleQuality"
  ) as HTMLSelectElement;
  const hiddenSelect = document.getElementById(
    "hiddenQuality"
  ) as HTMLSelectElement;
  const notificationsCheckbox = document.getElementById(
    "notificationsEnabled"
  ) as HTMLInputElement;
  const pauseModeCheckbox = document.getElementById(
    "pauseModeEnabled"
  ) as HTMLInputElement;

  if (
    !extensionCheckbox ||
    !visibleSelect ||
    !hiddenSelect ||
    !notificationsCheckbox ||
    !pauseModeCheckbox
  ) {
    throw new Error("One or more settings of the menu are not found.");
  }

  return {
    extensionCheckbox,
    visibleSelect,
    hiddenSelect,
    notificationsCheckbox,
    pauseModeCheckbox,
  };
}
