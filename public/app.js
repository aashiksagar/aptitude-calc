// Main Application: Scientific Calculator, Aptitude Formulas, Secret Triggers & Inactivity Lock
const SecretApp = (() => {
  // Session Configuration (Stored in memory/sessionStorage only)
  let userId = sessionStorage.getItem('calc_user_id') || ('User_' + Math.floor(1000 + Math.random() * 9000));
  let passphrase = sessionStorage.getItem('calc_passphrase') || 'SuperSecretKey2026';
  let unlockPin = sessionStorage.getItem('calc_pin') || '1337'; // Type 1337 and press '=' to unlock
  let isUnlocked = false;
  let unreadCount = 0;

  // Inactivity & Panic Timers
  let inactivityTimer = null;
  const INACTIVITY_TIMEOUT_MS = 30 * 1000; // 30 seconds

  // Calculator State
  let calcInput = '';
  let isRad = true;

  function init() {
    setupCalculator();
    setupAptitudeFormulas();
    setupSSE();
    setupInactivityWatchdog();
    setupPanicTriggers();
    setupSecretSettings();
    fetchStatus();

    // Init chat module
    ChatModule.init();
  }

  function getUserId() { return userId; }
  function getPassphrase() { return passphrase; }

  // ----------------------------------------------------
  // Disguised Status & Unread Count (v1.0.x)
  // ----------------------------------------------------
  async function fetchStatus() {
    try {
      const res = await fetch(`/api/status?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data && typeof data.unreadCount === 'number') {
        updateVersionBadge(data.unreadCount);
      }
    } catch (e) {
      console.warn('Status fetch error:', e);
    }
  }

  function updateVersionBadge(count) {
    unreadCount = count;
    const versionEl = document.getElementById('calcVersionBadge');
    if (versionEl) {
      versionEl.innerText = `Aptitude Suite Engine v1.0.${count}`;
    }
  }

  // ----------------------------------------------------
  // Server-Sent Events (SSE) for Real-Time Updates
  // ----------------------------------------------------
  function setupSSE() {
    const evtSource = new EventSource('/api/events');

    evtSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'unread_update') {
          updateVersionBadge(payload.data.count);
        } else if (payload.type === 'new_message') {
          ChatModule.onNewMessage(payload.data);
          // If we are looking at the chat, refresh status
          if (isUnlocked) {
            ChatModule.loadMessages();
          }
        } else if (payload.type === 'message_purged') {
          ChatModule.onMessagePurged(payload.data.id);
        } else if (payload.type === 'panic_wiped') {
          ChatModule.onPanicWiped();
        } else if (payload.type === 'webrtc_signal') {
          WebRTCCall.handleSignal(payload.data);
        }
      } catch (err) {
        console.error('SSE parsing error:', err);
      }
    };

    evtSource.onerror = () => {
      // Reconnect automatically handled by browser
    };
  }

  // ----------------------------------------------------
  // Inactivity Timer (30s) & Panic Triggers
  // ----------------------------------------------------
  function resetInactivityTimer() {
    if (!isUnlocked) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      console.log('Auto-locking due to 30s inactivity');
      lockChat();
    }, INACTIVITY_TIMEOUT_MS);
  }

  function setupInactivityWatchdog() {
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
  }

  function setupPanicTriggers() {
    // 1. Double-tap / double-click anywhere on chat screen to instantly lock
    let lastTap = 0;
    const chatView = document.getElementById('chatView');
    
    if (chatView) {
      chatView.addEventListener('click', (e) => {
        // Ignore clicks on input, buttons, audio controls to prevent accidental locks
        if (e.target.closest('input, textarea, button, audio, video, a')) return;

        const now = Date.now();
        if (now - lastTap < 300) {
          // Double-tap detected
          console.log('Double tap detected: Panic lock');
          lockChat();
        }
        lastTap = now;
      });
    }

    // 2. Screen off / Tab switch / Blur (Locks instantly before screen dims)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && isUnlocked) {
        console.log('Visibility hidden (screen off or tab switch): Locking chat');
        lockChat();
      }
    });

    window.addEventListener('blur', () => {
      if (isUnlocked) {
        console.log('Window blur: Locking chat');
        lockChat();
      }
    });

    // 3. Quick Lock button in chat header
    const lockBtn = document.getElementById('chatQuickLockBtn');
    if (lockBtn) {
      lockBtn.addEventListener('click', lockChat);
    }

    // 4. Keyboard ESC key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isUnlocked) {
        lockChat();
      }
    });
  }

  function unlockChat() {
    isUnlocked = true;
    document.getElementById('disguiseContainer').classList.add('hidden');
    document.getElementById('chatView').classList.remove('hidden');

    resetInactivityTimer();
    ChatModule.loadMessages();

    // Clear calculator display so nobody sees the PIN
    calcInput = '0';
    updateCalcDisplay();
  }

  function lockChat() {
    isUnlocked = false;
    clearTimeout(inactivityTimer);

    // End any active WebRTC calls immediately
    WebRTCCall.endCall(true);

    // Hide chat, show disguise
    document.getElementById('chatView').classList.add('hidden');
    document.getElementById('disguiseContainer').classList.remove('hidden');

    // Wipe unread badge back to status
    fetchStatus();
  }

  // ----------------------------------------------------
  // Scientific Calculator Implementation
  // ----------------------------------------------------
  function setupCalculator() {
    const buttons = document.querySelectorAll('.calc-btn');
    const display = document.getElementById('calcMainDisplay');
    const radDegBtn = document.getElementById('btnRadDeg');

    if (radDegBtn) {
      radDegBtn.addEventListener('click', () => {
        isRad = !isRad;
        radDegBtn.innerText = isRad ? 'RAD' : 'DEG';
      });
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        handleCalcInput(val);
      });
    });

    // Keyboard support for calculator
    window.addEventListener('keydown', (e) => {
      if (isUnlocked) return;
      if ((e.key >= '0' && e.key <= '9') || ['+', '-', '*', '/', '.', '(', ')'].includes(e.key)) {
        handleCalcInput(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalcInput('=');
      } else if (e.key === 'Backspace') {
        handleCalcInput('DEL');
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleCalcInput('AC');
      }
    });
  }

  function handleCalcInput(val) {
    if (!val) return;

    if (val === 'AC') {
      calcInput = '';
    } else if (val === 'DEL') {
      calcInput = calcInput.slice(0, -1);
    } else if (val === '=') {
      // Check for secret PIN trigger
      if (calcInput.trim() === unlockPin.trim()) {
        unlockChat();
        return;
      }

      // Normal math evaluation
      evaluateMath();
      return;
    } else if (val === 'sin' || val === 'cos' || val === 'tan' || val === 'log' || val === 'ln' || val === 'sqrt') {
      calcInput += `${val}(`;
    } else if (val === 'pi') {
      calcInput += 'π';
    } else if (val === 'pow') {
      calcInput += '^';
    } else {
      calcInput += val;
    }

    updateCalcDisplay();
  }

  function updateCalcDisplay() {
    const display = document.getElementById('calcMainDisplay');
    if (display) {
      display.innerText = calcInput || '0';
    }
  }

  function evaluateMath() {
    const subDisplay = document.getElementById('calcSubDisplay');
    if (subDisplay) subDisplay.innerText = calcInput + ' =';

    try {
      let expr = calcInput
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/\^/g, '**')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/log\(/g, 'Math.log10(');

      if (isRad) {
        expr = expr
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(');
      } else {
        // Degrees conversion
        expr = expr
          .replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
          .replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
          .replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)');
      }

      // Safe evaluation of mathematical characters only
      if (!/^[0-9+\-*/().\s,MathPIE*]+$/.test(expr)) {
        throw new Error('Invalid math syntax');
      }

      const result = Function(`'use strict'; return (${expr})`)();
      calcInput = (Math.round(result * 10000000) / 10000000).toString();
    } catch (e) {
      calcInput = 'Error';
    }
    updateCalcDisplay();
  }

  // ----------------------------------------------------
  // Aptitude Formula Reference & Solvers Tab
  // ----------------------------------------------------
  function setupAptitudeFormulas() {
    const tabCalc = document.getElementById('tabBtnCalc');
    const tabApt = document.getElementById('tabBtnAptitude');
    const calcSection = document.getElementById('scientificCalcSection');
    const aptSection = document.getElementById('aptitudeSection');

    if (tabCalc && tabApt) {
      tabCalc.addEventListener('click', () => {
        tabCalc.classList.add('active');
        tabApt.classList.remove('active');
        calcSection.classList.remove('hidden');
        aptSection.classList.add('hidden');
      });

      tabApt.addEventListener('click', () => {
        tabApt.classList.add('active');
        tabCalc.classList.remove('active');
        aptSection.classList.remove('hidden');
        calcSection.classList.add('hidden');
      });
    }

    // Interactive Aptitude Solver handlers
    const speedSolveBtn = document.getElementById('btnSolveSpeed');
    if (speedSolveBtn) {
      speedSolveBtn.addEventListener('click', () => {
        const d = parseFloat(document.getElementById('inputDist').value);
        const t = parseFloat(document.getElementById('inputTime').value);
        const out = document.getElementById('outSpeed');
        if (d > 0 && t > 0) {
          out.innerText = `Speed = ${(d / t).toFixed(2)} km/h (${((d / t) * (5 / 18)).toFixed(2)} m/s)`;
        } else {
          out.innerText = 'Enter valid distance and time.';
        }
      });
    }

    const ciSolveBtn = document.getElementById('btnSolveCI');
    if (ciSolveBtn) {
      ciSolveBtn.addEventListener('click', () => {
        const p = parseFloat(document.getElementById('inputPrincipal').value);
        const r = parseFloat(document.getElementById('inputRate').value);
        const t = parseFloat(document.getElementById('inputYears').value);
        const out = document.getElementById('outCI');
        if (p > 0 && r > 0 && t > 0) {
          const a = p * Math.pow(1 + (r / 100), t);
          out.innerText = `Total Amount: ₹${a.toFixed(2)} | CI: ₹${(a - p).toFixed(2)}`;
        } else {
          out.innerText = 'Enter valid values.';
        }
      });
    }
  }

  // ----------------------------------------------------
  // Secret Chat Settings (User ID, PIN, Passphrase)
  // ----------------------------------------------------
  function setupSecretSettings() {
    const openSettingsBtn = document.getElementById('chatSettingsBtn');
    const modal = document.getElementById('settingsModal');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');

    const inputUser = document.getElementById('settingsUserId');
    const inputPass = document.getElementById('settingsPassphrase');
    const inputPin = document.getElementById('settingsPin');

    if (openSettingsBtn && modal) {
      openSettingsBtn.addEventListener('click', () => {
        if (inputUser) inputUser.value = userId;
        if (inputPass) inputPass.value = passphrase;
        if (inputPin) inputPin.value = unlockPin;
        modal.classList.remove('hidden');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (inputUser.value.trim()) {
          userId = inputUser.value.trim();
          sessionStorage.setItem('calc_user_id', userId);
        }
        if (inputPass.value.trim()) {
          passphrase = inputPass.value.trim();
          sessionStorage.setItem('calc_passphrase', passphrase);
        }
        if (inputPin.value.trim()) {
          unlockPin = inputPin.value.trim();
          sessionStorage.setItem('calc_pin', unlockPin);
        }
        modal.classList.add('hidden');
        alert('Credentials updated for this session.');
        ChatModule.loadMessages();
      });
    }

    // Call UI Buttons
    const callAudioBtn = document.getElementById('callAudioBtn');
    const callVideoBtn = document.getElementById('callVideoBtn');
    if (callAudioBtn) {
      callAudioBtn.addEventListener('click', () => WebRTCCall.startCall('audio'));
    }
    if (callVideoBtn) {
      callVideoBtn.addEventListener('click', () => WebRTCCall.startCall('video'));
    }

    const acceptCallBtn = document.getElementById('acceptCallBtn');
    const rejectCallBtn = document.getElementById('rejectCallBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    const muteCallBtn = document.getElementById('muteCallBtn');
    const videoCallBtn = document.getElementById('videoToggleCallBtn');

    if (acceptCallBtn) acceptCallBtn.addEventListener('click', () => WebRTCCall.acceptCall());
    if (rejectCallBtn) rejectCallBtn.addEventListener('click', () => WebRTCCall.rejectCall());
    if (endCallBtn) endCallBtn.addEventListener('click', () => WebRTCCall.endCall(true));
    if (muteCallBtn) {
      muteCallBtn.addEventListener('click', () => {
        const isMicOn = WebRTCCall.toggleMute();
        muteCallBtn.innerText = isMicOn ? '🎤 Mute' : '🔇 Unmute';
      });
    }
    if (videoCallBtn) {
      videoCallBtn.addEventListener('click', () => {
        const isCamOn = WebRTCCall.toggleVideo();
        videoCallBtn.innerText = isCamOn ? '📹 Camera Off' : '📷 Camera On';
      });
    }
  }

  return {
    init,
    getUserId,
    getPassphrase,
    lockChat,
    unlockChat
  };
})();

// Start once DOM is ready
window.addEventListener('DOMContentLoaded', SecretApp.init);
