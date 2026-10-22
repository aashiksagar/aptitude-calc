# 📐 Aptitude Toolkit & Scientific Calculator (Covert E2EE Chat)

A private, end-to-end encrypted messaging web application completely disguised as an **Academic Aptitude Formula Sheet & Engineering Scientific Calculator**.

Built with zero external npm dependencies using native Node.js and standard modern browser APIs (`Web Crypto`, `WebRTC`, and `MediaRecorder`).

---

## 📑 Table of Contents
- [Overview & Visual Disguise](#-overview--visual-disguise)
- [Key Features](#-key-features)
- [How the Secrecy Works](#-how-the-secrecy-works)
- [Quick Start (Local Machine)](#-quick-start-local-machine)
- [Free Cloud Deployment (Koyeb — Permanent 24/7)](#-free-cloud-deployment-koyeb--permanent-247)
- [Mobile PWA Setup (Home Screen Disguise)](#-mobile-pwa-setup-home-screen-disguise)
- [Security & Cryptography Architecture](#-security--cryptography-architecture)
- [Secret Shortcuts & Panic Gestures Reference](#-secret-shortcuts--panic-gestures-reference)

---

## 🎭 Overview & Visual Disguise

To any casual observer or someone inspecting your device, this website looks and behaves like an engineering study tool:

1. **Working Scientific Calculator:**
   * Full arithmetic and scientific calculations.
   * Trigonometric functions: $\sin, \cos, \tan$ (with `DEG` / `RAD` toggle).
   * Logarithmic functions: $\ln(x), \log_{10}(x)$.
   * Powers, square roots, factorials, and parentheses.
   * Dynamic calculation history and sub-display.

2. **Aptitude Formula Cheat Sheet:**
   * Legitimate engineering formulas: Speed-Time-Distance, Compound Interest, Work & Time, and Probability.
   * Interactive solver calculators embedded inside formula cards.

---

## 🌟 Key Features

* **Secret PIN Unlock:** Entering a secret sequence on the calculator (default: `1337=`) switches into the encrypted chatroom.
* **Discreet Unread Indicator (`v1.0.x`):** The software version watermark at the bottom corner updates subtly to reflect unread messages:
  * `Aptitude Suite Engine v1.0.0` $\rightarrow$ 0 unread messages.
  * `Aptitude Suite Engine v1.0.3` $\rightarrow$ 3 unread messages waiting for you!
* **Asynchronous Messaging ("Type and Leave"):** Your friend can send messages while you are offline. They wait encrypted on the server until you open the chat.
* **5-Minute Self-Destruct After Read:** Once an unread message is opened, a live 5-minute countdown starts (`⏳ 4:59`). Exactly 5 minutes after being read, the message is permanently scrubbed from memory and storage.
* **30-Second Inactivity Auto-Lock:** If the chat is untouched for 30 seconds, it automatically wipes the decrypted view and snaps back to the calculator.
* **Instant Panic Triggers:**
  * **Double-tap anywhere:** Instantly locks back to the calculator.
  * **Power button / Tab switch:** The moment your phone screen turns off or tab is blurred, `visibilitychange` locks the chat before the screen even dims.
* **Encrypted Media & Calling:**
  * **Photos:** Compressed and encrypted client-side before transmission.
  * **Voice Memos:** In-browser microphone recorder with client-side encryption.
  * **P2P Audio & Video Calls:** Encrypted WebRTC peer-to-peer live calling without routing media through any server.

---

## 🔐 How the Secrecy Works

```
[Phone Screen: Scientific Calculator]
               │
               ▼  Type "1337" and press "="
[Secret Encrypted Chatroom Opens]
               │
               ├─► 30s Idle? ─────────────► Instantly returns to Calculator
               ├─► Double-Tap Screen? ─────► Instantly returns to Calculator
               ├─► Screen Off Button? ─────► Instantly returns to Calculator
               └─► Message Read? ──────────► ⏳ 5-Minute Countdown ──► Permanently Purged
```

---

## 🚀 Quick Start (Local Machine)

No external libraries or heavy installations required. Built on native Node.js.

### Prerequisites
* Node.js (version 18 or newer)

### Run the App
```bash
# 1. Navigate to the folder
cd /path/to/aptitude-calc-chat

# 2. Start the server
npm start
# or
node local-server.js
```

Open your browser at: **`http://localhost:3000`**

---

## 🌐 Free Cloud Deployment (Koyeb — Permanent 24/7)

Deploying to **Koyeb** is free, permanent, and **does not go to sleep after 15 minutes** (zero cold starts).

1. Go to **[koyeb.com](https://www.koyeb.com)** and sign in with GitHub.
2. Click **Create Service** $\rightarrow$ select **GitHub**.
3. Select your repository: **`aashiksagar/aptitude-calc`** (Branch: `main`).
4. Configure:
   * **Instance Type:** `Eco` $\rightarrow$ `Free (Nano)`
   * **Region:** Select the region closest to you (e.g. `Singapore` or `Frankfurt`).
   * **Exposed Ports:** Set port to **`3000`** with protocol **`HTTP`**.
   * **App Name:** Name it something academic like `aptitude-calc-suite`.
5. Click **Deploy**. In ~45 seconds, your permanent live link (e.g., `https://aptitude-calc-suite-xxx.koyeb.app`) is active with automatic HTTPS!

---

## 📱 Mobile PWA Setup (Home Screen Disguise)

To disguise it on iOS or Android so it runs full-screen without an address bar:

1. Open your live HTTPS link in **Safari (iPhone)** or **Chrome (Android)**.
2. Tap the **Share** button (iOS) or **Three Dots menu** (Android).
3. Select **"Add to Home Screen"**.
4. Name the icon **"Aptitude Calc"**.
5. When tapped from your home screen, it launches full-screen looking 100% like a native system calculator.

---

## 🛡️ Security & Cryptography Architecture

* **Zero-Knowledge Architecture:** Messages are encrypted in the sender's browser using **AES-256-GCM** via the browser's native `window.crypto.subtle` API before leaving the device.
* **Key Derivation:** The encryption key is derived using **PBKDF2** (SHA-256, 100,000 iterations) from a shared passphrase set by you and your friend.
* **Server Blindness:** The server acts only as an encrypted relay. Even if the server database is inspected, all contents, images, and audio are unreadable ciphertext blobs.
* **No App Store Trails:** Because it operates as a web app/PWA, it never appears in your Apple ID or Google Play purchase and download history.

---

## ⚡ Secret Shortcuts & Panic Gestures Reference

| Action / Gesture | Trigger | Result |
| :--- | :--- | :--- |
| **Unlock Chat** | Type `1337` and press `=` | Opens secret chatroom |
| **Panic Exit (Touch)** | Double-tap / double-click anywhere | Instantly snaps back to calculator |
| **Panic Exit (Key)** | Press `ESC` | Instantly snaps back to calculator |
| **Screen Dim / Lock** | Press phone power button | Instantly locks chat before screen dims |
| **Tab Switch / Blur** | Minimize tab or switch app | Instantly locks chat |
| **Inactivity Lock** | Untouched for 30 seconds | Returns to calculator & clears active view |
| **Emergency Purge** | Click `⚠️` button in chat | Instantly vaporizes all messages on server |
| **Settings** | Click `⚙️` button in chat | Change Display Name, PIN code, or Shared Key |

---

## 🛠️ Project Structure

```
├── local-server.js    # Zero-dependency Node.js HTTP server & REST relay
├── package.json       # App scripts and metadata
├── index.html         # Main UI (Calculator, Aptitude reference, Chat, Call modals)
├── style.css          # Dark-mode styling for disguise and chat
├── app.js             # Calculator math parser, aptitude solvers, secret triggers
├── chat.js            # Message handling, 5-min self-destruct timers, voice notes
├── crypto.js          # Client-side AES-256-GCM Web Crypto engine
├── webrtc.js          # Encrypted P2P Audio/Video calling logic
└── manifest.json      # PWA standalone full-screen manifest
```
