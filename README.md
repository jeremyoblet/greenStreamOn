# 🎥 GREEN STREAM ON (Chrome Extension)

---
Streamez responsable sans efforts.
Jusqu'à 90% de bande passante économisée en écoute passive.

GreenStreamOn reduis automatiquement la qualité des vidéos YouTube lorsque la page est cachée ou réduite et rebascule automatiquement la qualité de visionnage définie lorsque la page est de nouveau visible.
Idéal pour l'écoute passive de musique ou de podcasts en travaillant ou en surfant sur le web.

**Automatically optimize YouTube video quality based on Chrome tab or window visibility.**
shortcut: alt + shift +g -> switch enabling the extension

## 🚀 Features

- 🔻 Automatically lowers video quality when the tab or Chrome window is hidden
- 🔺 Automatically restores a preferred quality when the tab becomes active again
- ⚙️ User-configurable min and max quality via a simple interface (`popup.html`)
- 🧹 Modular and extensible architecture
- 🛠️ Developed in TypeScript with `esbuild` for bundling

## 🧱 Architecture

The project follows a **modular** and **scalable** design, inspired by hexagonal architecture:

```
src/
├── background/        # Scripts d'arrière-plan (event pages, listeners globaux)
│   ├── handlers/      # Fonctions spécifiques aux événements du runtime ou messages
│   ├── background.ts  # Entrée principale du background script
│   └── defaultSettings.ts  # Valeurs par défaut pour la configuration utilisateur

├── content/           # Scripts injectés dans les pages YouTube
│   ├── .debug/        # Outils de debug pour les content scripts
│   ├── core/          # Logique métier centrale exécutée côté page
│   ├── ui/            # Gestion de l'interface modifiée sur YouTube
│   ├── utils/         # Fonctions utilitaires côté content
│   ├── content.ts     # Script principal injecté
│   └── listeners.ts   # Écouteurs DOM ou message côté page

├── popup/             # Code de l'interface (popup) affichée à l'utilisateur
│   ├── messaging.ts   # Communication entre popup et background
│   ├── popup.html     # Fichier HTML principal
│   ├── popup.ts       # Logique principale de l'UI (source TypeScript)
│   ├── popup.js       # Version compilée JS (si générée)
│   ├── styles.css     # Styles du popup
│   └── ui.ts          # Composants ou logique UI

├── manifest.json      # Fichier de configuration de l'extension Chrome
├── types.ts           # Déclarations de types partagés entre les modules
```

## 🥪 How It Works

1. The extension listens for visibility changes (tab active/inactive, window visible/hidden)
2. It adjusts the video quality on YouTube based on the user's preferences
3. Settings are saved using `chrome.storage` for persistence

## 🛠️ Development Setup

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/youtube-stream-saver.git
cd youtube-stream-saver
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build the project:**

```bash
npm run build
```

4. **Load the extension in Chrome:**

   - Go to `chrome://extensions/`
   - Enable **Developer Mode**
   - Click **Load unpacked**
   - Select the `dist/` folder

## 📆 Packaging & Publishing

A GitHub Actions pipeline builds and (optionally) publishes the extension to the Chrome Web Store (WIP).

## 📌 Chrome Permissions Used

- `tabs`
- `storage`
- `notifications`

## 📌 Roadmap

- [x] MVP for automatic video quality adjustment
- [ ] Support for multiple video platforms (Twitch, Vimeo...)
- [ ] UI improvements
- [ ] Anonymous usage statistics
- [ ] Premium account connection ( connecting to an another service )
