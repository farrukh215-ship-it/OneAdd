import AsyncStorage from '@react-native-async-storage/async-storage';

type StorageAdapter = {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: string | boolean | number) => void;
  remove: (key: string) => void;
};

const memoryStorage = new Map<string, string>();

async function hydrateFromDisk() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (!keys.length) return;
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value !== null) {
        memoryStorage.set(key, value);
      }
    }
  } catch {
    // Keep startup resilient even if persistent storage is unavailable.
  }
}

void hydrateFromDisk();

export const storage: StorageAdapter = {
  getString: (key) => memoryStorage.get(key),
  getBoolean: (key) => {
    const raw = memoryStorage.get(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return undefined;
  },
  set: (key, value) => {
    const serialized = String(value);
    memoryStorage.set(key, serialized);
    void AsyncStorage.setItem(key, serialized).catch(() => {
      // No-op on persistence error; in-memory state is still available.
    });
  },
  remove: (key) => {
    memoryStorage.delete(key);
    void AsyncStorage.removeItem(key).catch(() => {
      // No-op on persistence error.
    });
  },
};
