# Aptitude Cheat Sheet & Scientific Calculator (Covert E2EE Chat)

A covert, end-to-end encrypted messaging website disguised as an **Aptitude Formula Cheat Sheet & Scientific Calculator**.

---

## 🔒 Covert & Security Features

1. **Dual Disguise:**
   * **Scientific Calculator:** Fully functional math (trigonometry, logs, square roots, powers, parentheses).
   * **Aptitude Cheat Sheet:** Real formula cards and interactive solvers (Speed-Time-Distance, Compound Interest, Work & Time, Probability).

2. **Secret Trigger:**
   * Default unlock sequence: Type `1337` on the calculator and press `=`.
   * The calculator immediately slides away into the encrypted chatroom.
   * Can be customized in Settings (⚙️).

3. **Disguised Unread Indicator (`v1.0.x`):**
   * At the bottom corner of the calculator, a subtle software watermark reads `Aptitude Suite Engine v1.0.x`.
   * **`x` represents the exact number of unread messages waiting for you** (`v1.0.0` = 0 unread, `v1.0.2` = 2 unread).

4. **Panic & Auto-Lock Triggers:**
   * **30-Second Inactivity Lock:** If untouched for 30 seconds, it immediately returns to the calculator.
   * **Double-Tap Anywhere:** Double-clicking/tapping anywhere on the chat instantly locks it.
   * **Screen Off / Tab Switch:** Pressing your phone's power button or switching tabs instantly locks it before the screen goes dark (`visibilitychange` + `blur`).
   * **Emergency Lock Button:** Discrete `🔒 Lock` button and `ESC` key support.
   * **Panic Wipe Button (⚠️):** One-click permanent purge of all messages.

5. **5-Minute Self-Destruct After Read:**
   * Messages persist on the encrypted server until you read them ("type and leave").
   * Once read, a **5-minute live countdown timer** starts (`⏳ 4:59`).
   * Exactly 5 minutes after being read, the message is permanently scrubbed from memory and the server.

6. **Media & Real-Time Calling:**
   * **Encrypted Photos:** Upload photos, encrypted client-side with AES-256-GCM.
   * **Voice Notes:** Record encrypted voice memos directly in browser.
   * **P2P Audio/Video Calls:** Direct encrypted WebRTC calls between peers.

---

## 🚀 How to Run

Zero external npm dependencies required! Built completely on native Node.js.

```bash
# Navigate to project directory
cd /Users/aashiksagar/.gemini/antigravity/scratch/aptitude-calc-chat

# Start the server
node server.js
# or
npm start
```

Open your browser to: **`http://localhost:3000`**

---

## 📱 How to Use on Phones (PWA Disguise)

1. Open the URL in Safari (iPhone) or Chrome (Android).
2. Tap **Share** (iOS) or the three-dots menu (Android) $\rightarrow$ **"Add to Home Screen"**.
3. Name it **"Aptitude Calc"**.
4. It will launch in full screen with no browser address bar, looking 100% like a native calculator app.

---

## 🌐 Free Deployment for You and Your Friend

To chat remotely over the internet, deploy this project for free in 2 minutes:
* **Render.com** (Free Web Service $\rightarrow$ point to repository $\rightarrow$ Build: blank, Start: `node server.js`)
* **Fly.io** (`fly launch`)
* **Railway.app** or **Glitch.com**
