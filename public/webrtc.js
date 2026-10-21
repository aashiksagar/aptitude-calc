// WebRTC Peer-to-Peer Encrypted Audio/Video Call Module
const WebRTCCall = (() => {
  let localStream = null;
  let remoteStream = null;
  let peerConnection = null;
  let currentCallType = 'audio'; // 'audio' or 'video'
  let isInitiator = false;

  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  async function sendSignal(signalType, payload) {
    try {
      const myId = window.SecretApp ? window.SecretApp.getUserId() : 'user';
      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: myId,
          type: signalType,
          payload
        })
      });
    } catch (err) {
      console.error('Signaling error:', err);
    }
  }

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection(RTC_CONFIG);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('candidate', event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        remoteStream = event.streams[0];
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }
  }

  async function startCall(callType = 'audio') {
    currentCallType = callType;
    isInitiator = true;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });

      const localVideo = document.getElementById('localVideo');
      if (localVideo) {
        localVideo.srcObject = localStream;
      }

      createPeerConnection();

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      await sendSignal('offer', { offer, callType });
      showCallUI(true, 'Calling friend...');
    } catch (err) {
      alert('Could not access microphone/camera: ' + err.message);
      endCall(false);
    }
  }

  async function handleIncomingOffer(offer, callType, senderId) {
    currentCallType = callType;
    isInitiator = false;

    // Show incoming call prompt
    const incomingModal = document.getElementById('incomingCallModal');
    const incomingCallerText = document.getElementById('incomingCallerText');
    if (incomingCallerText) {
      incomingCallerText.innerText = `Incoming ${callType.toUpperCase()} call from ${senderId}...`;
    }
    if (incomingModal) {
      incomingModal.classList.remove('hidden');
    }

    // Store offer for answer
    window._pendingOffer = offer;
  }

  async function acceptCall() {
    const incomingModal = document.getElementById('incomingCallModal');
    if (incomingModal) incomingModal.classList.add('hidden');

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: currentCallType === 'video'
      });

      const localVideo = document.getElementById('localVideo');
      if (localVideo) {
        localVideo.srcObject = localStream;
      }

      createPeerConnection();

      await peerConnection.setRemoteDescription(new RTCSessionDescription(window._pendingOffer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      await sendSignal('answer', { answer });
      showCallUI(true, 'Connected');
    } catch (err) {
      alert('Failed to accept call: ' + err.message);
      endCall(true);
    }
  }

  function rejectCall() {
    const incomingModal = document.getElementById('incomingCallModal');
    if (incomingModal) incomingModal.classList.add('hidden');
    sendSignal('hangup', {});
    window._pendingOffer = null;
  }

  async function handleIncomingAnswer(answer) {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      const statusText = document.getElementById('callStatusText');
      if (statusText) statusText.innerText = 'Connected';
    }
  }

  async function handleIncomingCandidate(candidate) {
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Error adding ICE candidate:', e);
      }
    }
  }

  function toggleMute() {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  function toggleVideo() {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  function endCall(notifyPeer = true) {
    if (notifyPeer) {
      sendSignal('hangup', {});
    }

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop());
      remoteStream = null;
    }
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    showCallUI(false);
    window._pendingOffer = null;
  }

  function showCallUI(show, status = 'In Call') {
    const modal = document.getElementById('activeCallModal');
    const statusText = document.getElementById('callStatusText');
    if (modal) {
      if (show) {
        modal.classList.remove('hidden');
        if (statusText) statusText.innerText = status;
      } else {
        modal.classList.add('hidden');
      }
    }
  }

  let lastSignalTime = Date.now();
  let signalPollId = null;

  async function pollSignals() {
    try {
      const res = await fetch(`/api/signal?since=${lastSignalTime}`);
      const data = await res.json();
      if (data && data.signals) {
        for (const sig of data.signals) {
          if (sig.timestamp > lastSignalTime) {
            lastSignalTime = sig.timestamp;
            handleSignal(sig);
          }
        }
      }
    } catch (e) {}
  }

  function startSignalPolling() {
    if (signalPollId) clearInterval(signalPollId);
    lastSignalTime = Date.now();
    signalPollId = setInterval(pollSignals, 2000);
  }

  function stopSignalPolling() {
    if (signalPollId) {
      clearInterval(signalPollId);
      signalPollId = null;
    }
  }

  // Handle incoming signaling message
  function handleSignal(msg) {
    const myId = window.SecretApp ? window.SecretApp.getUserId() : 'user';
    if (msg.sender === myId) return; // Ignore own echoes

    if (msg.type === 'offer') {
      handleIncomingOffer(msg.payload.offer, msg.payload.callType, msg.sender);
    } else if (msg.type === 'answer') {
      handleIncomingAnswer(msg.payload.answer);
    } else if (msg.type === 'candidate') {
      handleIncomingCandidate(msg.payload);
    } else if (msg.type === 'hangup') {
      endCall(false);
    }
  }

  return {
    startCall,
    acceptCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    endCall,
    handleSignal,
    startSignalPolling,
    stopSignalPolling
  };
})();
