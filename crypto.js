// Client-side End-to-End Encryption using Web Crypto API (AES-256-GCM)
const ChatCrypto = (() => {
  const SALT = new TextEncoder().encode('AptitudeFormulaSecretSalt2026');
  let cachedKey = null;

  async function getKeyFromPassphrase(passphrase) {
    if (cachedKey && cachedKey.passphrase === passphrase) {
      return cachedKey.key;
    }
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: SALT,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    cachedKey = { passphrase, key: derivedKey };
    return derivedKey;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async function encryptText(plainText, passphrase) {
    const key = await getKeyFromPassphrase(passphrase);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      iv: arrayBufferToBase64(iv)
    };
  }

  async function decryptText(ciphertextBase64, ivBase64, passphrase) {
    try {
      const key = await getKeyFromPassphrase(passphrase);
      const iv = base64ToArrayBuffer(ivBase64);
      const ciphertext = base64ToArrayBuffer(ciphertextBase64);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.warn('Decryption failed (wrong passphrase or corrupted message):', err);
      return '[Encrypted Message - Key Mismatch]';
    }
  }

  return {
    encryptText,
    decryptText,
    arrayBufferToBase64,
    base64ToArrayBuffer
  };
})();
