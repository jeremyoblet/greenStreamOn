type QueuedNotification = { visibility: "visible" | "hidden"; quality: string };

let debounceTimer: number | null = null;
const notificationBuffer: QueuedNotification[] = [];

// Map qualité → emoji
const qualityEmojiMap: Record<string, string> = {
  "144p": "🟢",
  "240p": "🟢",
  "360p": "🟡",
  "480p": "🟡",
  "720p": "🟠",
  "1080p": "🔵",
  "1440p": "🟣",
  "2160p": "🔴",
  Auto: "⚙️",
};

export function showToggleNotification(enabled: boolean): void {
  const notificationId = `toggle-${Date.now()}`;
  chrome.notifications.create(
    notificationId,
    {
      type: "basic",
      iconUrl: "icons/icon_128.png",
      title: "Green Stream ON",
      message: enabled ? "✅ Extension enabled" : "⛔ Extension disabled",
    },
    (id) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[notificationsHandler] Failed to create notification:",
          chrome.runtime.lastError.message
        );
        return;
      }
      if (!id) return;
      setTimeout(() => {
        chrome.notifications.clear(id);
      }, 2000);
    }
  );
}

export function queueNotification(
  visibility: "visible" | "hidden",
  quality: string
): void {
  notificationBuffer.push({ visibility, quality });

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    showGroupedNotification(notificationBuffer.slice());
    notificationBuffer.length = 0;
    debounceTimer = null;
  }, 150);
}

function showGroupedNotification(entries: QueuedNotification[]): void {
  const message = entries
    .map((entry) => {
      const emoji = qualityEmojiMap[entry.quality] ?? "📺";
      const label =
        entry.visibility === "visible" ? "tab visible" : "tab cachée";
      return `• ${label}  →  ${emoji} ${entry.quality}`;
    })
    .join("\n");

  const notificationId = `group-${Date.now()}-${Math.random()}`;
  chrome.notifications.create(
    notificationId,
    {
      type: "basic",
      iconUrl: "icons/icon_128.png",
      title: "Changement de qualité détecté",
      message,
    },
    (id) => {
      if (chrome.runtime.lastError) {
        console.error(
          "[notificationsHandler] Failed to create notification:",
          chrome.runtime.lastError.message
        );
        return;
      }
      if (!id) {
        console.warn("[notificationsHandler] Notification created but no ID returned");
        return;
      }
      setTimeout(() => {
        chrome.notifications.clear(id);
      }, 3000);
    }
  );
}
