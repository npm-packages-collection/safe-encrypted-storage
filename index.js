export class SafeStorage {
  // Private instance fields
  #mechanism;
  #encryptionKey;
  #dbName;
  #storeName;
  #keyInitialized;

  // Static field for default storage type
  static #defaultType = 'localStorage';

  /**
   * Static method to initialize the class
   * @param {string} type - The type of storage to use ('localStorage' or 'sessionStorage').
   */
  static init(type = SafeStorage.#defaultType) {
    return new SafeStorage(type);
  }

  /**
   * Constructor for SafeStorage class.
   * @param {string} type - The type of storage to use ('localStorage' or 'sessionStorage').
   */
  constructor(type = 'localStorage') {
    this.#mechanism = type === 'sessionStorage' ? sessionStorage : localStorage;
    this.#encryptionKey = null;
    this.#dbName = 'client'; // Discreet IndexedDB name
    this.#storeName = 'keys'; // Store name within IndexedDB
    this.#keyInitialized = false; // Flag to indicate if the key has been initialized
  }

  /**
   * Initializes IndexedDB for storing encryption keys.
   * @returns {Promise<IDBDatabase>}
   */
  async #initIndexDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(this.#storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Stores the encryption key in IndexedDB.
   * @param {CryptoKey} key - The encryption key to store.
   * @returns {Promise<void>}
   */
  async #setKey(key) {
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const db = await this.#initIndexDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.#storeName, 'readwrite');
      const store = tx.objectStore(this.#storeName);
      const request = store.put(exportedKey, 'encryptionKey');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves the encryption key from IndexedDB.
   * @returns {Promise<CryptoKey | null>}
   */
  async #getKey() {
    const db = await this.#initIndexDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.#storeName, 'readonly');
      const store = tx.objectStore(this.#storeName);
      const request = store.get('encryptionKey');
      request.onsuccess = async () => {
        if (request.result) {
          const importedKey = await crypto.subtle.importKey(
            'raw',
            request.result,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          );
          resolve(importedKey);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generates a new AES-GCM encryption key and stores it in IndexedDB.
   * @returns {Promise<void>}
   */
  async #generateKey() {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    this.#encryptionKey = key;
    await this.#setKey(key);
  }

  /**
   * Initializes the encryption key only if it hasn't been initialized yet.
   */
  async #initKey() {
    if (!this.#keyInitialized) {
      const storedKey = await this.#getKey();
      if (storedKey) {
        this.#encryptionKey = storedKey;
      } else {
        await this.#generateKey();
      }
      this.#keyInitialized = true;
    }
  }

  /**
   * Encrypts the given data.
   * @param {any} data - The data to encrypt.
   * @returns {Promise<object>} The encrypted data with the IV.
   */
  async #encrypt(data) {
    await this.#initKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      this.#encryptionKey,
      encodedData
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  /**
   * Decrypts the given data.
   * @param {object} eData - The encrypted data.
   * @returns {Promise<any>} The decrypted data.
   */
  async #decrypt(eData) {
    await this.#initKey();
    const iv = new Uint8Array(eData.iv);
    const encrypted = new Uint8Array(eData.data);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      this.#encryptionKey,
      encrypted
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  /**
   * Converts an array of bytes to a Base64 string.
   * @param {Uint8Array} bytes - The byte array to encode.
   * @returns {string} The Base64 string.
   */
  #toBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Converts a Base64 string to an array of bytes.
   * @param {string} base64 - The Base64 string to decode.
   * @returns {Uint8Array} The decoded byte array.
   */
  #fromBase64(base64) {
    return new Uint8Array(atob(base64).split("").map(char => char.charCodeAt(0)));
  }

  /**
   * Encrypts the given key and encodes it as a Base64 string.
   * @param {string} key - The key to encrypt.
   * @returns {Promise<string>} The encrypted key as a Base64 string.
   */
  async #encryptKey(key) {
    const encryptedKey = await this.#encrypt(key);
    const base64Iv = this.#toBase64(new Uint8Array(encryptedKey.iv));
    const base64Data = this.#toBase64(new Uint8Array(encryptedKey.data));
    return `${base64Iv}:${base64Data}`;
  }

  /**
   * Decrypts a Base64-encoded encrypted key.
   * @param {string} encryptedKey - The Base64-encoded encrypted key.
   * @returns {Promise<string>} The decrypted key.
   */
  async #decryptKey(encryptedKey) {
    const [base64Iv, base64Data] = encryptedKey.split(":");
    const iv = this.#fromBase64(base64Iv);
    const data = this.#fromBase64(base64Data);
    return this.#decrypt({ iv: Array.from(iv), data: Array.from(data) });
  }

  /**
   * Looks for a matching encrypted key by decrypting all stored keys
   * and comparing to the incoming cleartext key.
   * @param {string} key - The cleartext key.
   * @returns {Promise<string|null>} The encrypted key or null if not found.
   */
  async #findEncryptedKey(key) {
    for (let i = 0; i < this.#mechanism.length; i++) {
      const encryptedKey = this.#mechanism.key(i);
      const decryptedKey = await this.#decryptKey(encryptedKey);
      if (decryptedKey === key) {
        return encryptedKey;
      }
    }
    return null;
  }

  /**
   * Set data in storage after checking if the key already exists.
   * If it exists, overwrite the existing value; otherwise, create a new entry.
   * @param {string} key - The storage key.
   * @param {any} value - The data to store.
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    let encryptedKey = await this.#findEncryptedKey(key);
    if (!encryptedKey) {
      encryptedKey = await this.#encryptKey(key); // Encrypt the key if it's new
    }
    const encryptedValue = await this.#encrypt(value);
    this.#mechanism.setItem(encryptedKey, JSON.stringify(encryptedValue));
  }

  /**
   * Get and decrypt data from storage by encrypting the key and retrieving the value.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<any>}
   */
  async getItem(key) {
    const encryptedKey = await this.#findEncryptedKey(key);
    if (!encryptedKey) return null; // If no encrypted key is found, return null
    const encryptedValue = JSON.parse(this.#mechanism.getItem(encryptedKey)); // Retrieve the encrypted value
    return this.#decrypt(encryptedValue); // Decrypt and return the value
  }

  /**
   * Remove a specific item from storage by encrypting the key first.
   * @param {string} key - The key to remove.
   */
  async removeItem(key) {
    const encryptedKey = await this.#findEncryptedKey(key);
    if (encryptedKey) {
      this.#mechanism.removeItem(encryptedKey);
    }
  }

  /**
   * Clear all storage.
   */
  clear() {
    this.#mechanism.clear();
  }
}
