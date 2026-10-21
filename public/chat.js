// Chat UI and Logic with 5-Minute Self-Destruct Timers & Encrypted Media
const ChatModule = (() => {
  let messages = [];
  let countdownTimerId = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  async function init() {
    setupEventListeners();
    startCountdownLoop();
  }

  function setupEventListeners() {
    const sendBtn = document.getElementById('chatSendBtn');
    const input = document.getElementById('chatInput');
    const imageInput = document.getElementById('imageUploadInput');
    const micBtn = document.getElementById('micRecordBtn');
    const panicWipeBtn = document.getElementById('panicWipeBtn');

    if (sendBtn) {
      sendBtn.addEventListener('click', handleSendText);
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendText();
        }
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', handleImageUpload);
    }

    if (micBtn) {
      micBtn.addEventListener('click', toggleVoiceRecording);
    }

    if (panicWipeBtn) {
      panicWipeBtn.addEventListener('click', handlePanicWipe);
    }
  }

  async function loadMessages() {
    const userId = window.SecretApp.getUserId();
    try {
      const res = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data && data.messages) {
        messages = data.messages;
        await renderMessages();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }

  async function handleSendText() {
    const input = document.getElementById('chatInput');
    const text = input ? input.value.trim() : '';
    if (!text) return;

    input.value = '';
    const passphrase = window.SecretApp.getPassphrase();
    const userId = window.SecretApp.getUserId();

    // Encrypt client-side
    const encrypted = await ChatCrypto.encryptText(text, passphrase);

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: userId,
          content: encrypted.ciphertext,
          iv: encrypted.iv
        })
      });
      const data = await res.json();
      if (data.success) {
        // optimistically add or wait for event
      }
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Max 10MB file
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const passphrase = window.SecretApp.getPassphrase();
      const userId = window.SecretApp.getUserId();

      // Encrypt the image base64 data string
      const encrypted = await ChatCrypto.encryptText(base64Data, passphrase);

      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: userId,
            mediaType: 'image',
            mediaData: encrypted.ciphertext,
            iv: encrypted.iv
          })
        });
      } catch (err) {
        alert('Image sending failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  }

  async function toggleVoiceRecording() {
    const micBtn = document.getElementById('micRecordBtn');
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());

          // Convert to base64 and encrypt
          const reader = new FileReader();
          reader.onload = async () => {
            const base64Audio = reader.result;
            const passphrase = window.SecretApp.getPassphrase();
            const userId = window.SecretApp.getUserId();
            const encrypted = await ChatCrypto.encryptText(base64Audio, passphrase);

            await fetch('/api/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender: userId,
                mediaType: 'audio',
                mediaData: encrypted.ciphertext,
                iv: encrypted.iv
              })
            });
          };
          reader.readAsDataURL(audioBlob);
        };

        mediaRecorder.start();
        isRecording = true;
        if (micBtn) {
          micBtn.classList.add('recording');
          micBtn.title = 'Click to finish recording voice note';
        }
      } catch (err) {
        alert('Could not access microphone: ' + err.message);
      }
    } else {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      isRecording = false;
      if (micBtn) {
        micBtn.classList.remove('recording');
        micBtn.title = 'Record voice note';
      }
    }
  }

  async function handlePanicWipe() {
    if (confirm('EMERGENCY: Purge all chat messages immediately?')) {
      try {
        await fetch('/api/panic', { method: 'POST' });
        messages = [];
        renderMessages();
      } catch (err) {
        alert('Failed to wipe messages: ' + err.message);
      }
    }
  }

  async function onNewMessage(msg) {
    // If not already in list
    if (!messages.find(m => m.id === msg.id)) {
      messages.push(msg);
      // Mark read if we are looking at it and we are not sender
      const myId = window.SecretApp.getUserId();
      if (msg.sender !== myId && !msg.readAt) {
        msg.readAt = Date.now();
        msg.expiresAt = msg.readAt + FIVE_MINUTES_MS;
      }
      await renderMessages();
    }
  }

  function onMessagePurged(id) {
    messages = messages.filter(m => m.id !== id);
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.classList.add('purged');
      setTimeout(() => el.remove(), 400);
    }
  }

  function onPanicWiped() {
    messages = [];
    const list = document.getElementById('chatMessagesList');
    if (list) list.innerHTML = '';
  }

  async function renderMessages() {
    const list = document.getElementById('chatMessagesList');
    if (!list) return;

    const myId = window.SecretApp.getUserId();
    const passphrase = window.SecretApp.getPassphrase();
    const now = Date.now();

    // Filter out already expired
    messages = messages.filter(m => !m.expiresAt || m.expiresAt > now);

    list.innerHTML = '';

    if (messages.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'chat-empty-hint';
      emptyDiv.innerHTML = `
        <div class="empty-icon">🔒</div>
        <p>No messages yet. Chat is end-to-end encrypted.</p>
        <p class="subhint">Messages permanently self-destruct 5 minutes after being read.</p>
      `;
      list.appendChild(emptyDiv);
      return;
    }

    for (const msg of messages) {
      const isMine = msg.sender === myId;
      const bubble = document.createElement('div');
      bubble.id = `msg-${msg.id}`;
      bubble.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;

      // Sender badge
      const senderSpan = document.createElement('div');
      senderSpan.className = 'bubble-sender';
      senderSpan.innerText = isMine ? 'You' : msg.sender;
      bubble.appendChild(senderSpan);

      // Decrypt and display content
      const contentDiv = document.createElement('div');
      contentDiv.className = 'bubble-content';

      if (msg.mediaType === 'image') {
        const decryptedImgData = await ChatCrypto.decryptText(msg.mediaData, msg.iv, passphrase);
        const img = document.createElement('img');
        img.src = decryptedImgData;
        img.className = 'chat-media-img';
        img.alt = 'Encrypted Photo';
        img.onclick = () => window.open(decryptedImgData, '_blank');
        contentDiv.appendChild(img);
      } else if (msg.mediaType === 'audio') {
        const decryptedAudioData = await ChatCrypto.decryptText(msg.mediaData, msg.iv, passphrase);
        const audio = document.createElement('audio');
        audio.src = decryptedAudioData;
        audio.controls = true;
        audio.className = 'chat-media-audio';
        contentDiv.appendChild(audio);
      } else if (msg.content) {
        const decryptedText = await ChatCrypto.decryptText(msg.content, msg.iv, passphrase);
        contentDiv.innerText = decryptedText;
      }

      bubble.appendChild(contentDiv);

      // Meta: timestamp & 5-minute countdown badge
      const metaDiv = document.createElement('div');
      metaDiv.className = 'bubble-meta';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'bubble-time';
      const d = new Date(msg.createdAt);
      timeSpan.innerText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      metaDiv.appendChild(timeSpan);

      // Self-destruct badge
      if (msg.expiresAt) {
        const countdownSpan = document.createElement('span');
        countdownSpan.className = 'bubble-timer';
        countdownSpan.id = `timer-${msg.id}`;
        updateTimerBadge(countdownSpan, msg.expiresAt);
        metaDiv.appendChild(countdownSpan);
      } else {
        const unreadSpan = document.createElement('span');
        unreadSpan.className = 'bubble-unread-badge';
        unreadSpan.innerText = isMine ? 'Sent' : 'Unread';
        metaDiv.appendChild(unreadSpan);
      }

      bubble.appendChild(metaDiv);
      list.appendChild(bubble);
    }

    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
  }

  function updateTimerBadge(el, expiresAt) {
    const diff = Math.max(0, expiresAt - Date.now());
    const totalSec = Math.floor(diff / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const formatted = `⏳ ${min}:${sec < 10 ? '0' : ''}${sec}`;
    el.innerText = formatted;

    if (totalSec <= 60) {
      el.classList.add('urgent');
    }
  }

  function startCountdownLoop() {
    if (countdownTimerId) clearInterval(countdownTimerId);
    countdownTimerId = setInterval(() => {
      const now = Date.now();
      let hasExpired = false;

      for (const msg of messages) {
        if (msg.expiresAt) {
          const el = document.getElementById(`timer-${msg.id}`);
          if (el) {
            updateTimerBadge(el, msg.expiresAt);
          }
          if (msg.expiresAt <= now) {
            hasExpired = true;
          }
        }
      }

      if (hasExpired) {
        messages = messages.filter(m => !m.expiresAt || m.expiresAt > now);
        renderMessages();
      }
    }, 1000);
  }

  let chatPollingId = null;

  function startPolling() {
    if (chatPollingId) clearInterval(chatPollingId);
    // Poll messages every 2.5s while chat is unlocked for snappy response
    chatPollingId = setInterval(loadMessages, 2500);
  }

  function stopPolling() {
    if (chatPollingId) {
      clearInterval(chatPollingId);
      chatPollingId = null;
    }
  }

  return {
    init,
    loadMessages,
    startPolling,
    stopPolling,
    onNewMessage,
    onMessagePurged,
    onPanicWiped
  };
})();
