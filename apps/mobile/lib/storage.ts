type StorageAdapter = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

const memoryStorage = new Map<string, string>();

const fallbackStorage: StorageAdapter = {
  getString: (key) => memoryStorage.get(key),
  set: (key, value) => {
    memoryStorage.set(key, value);
  },
  delete: (key) => {
    memoryStorage.delete(key);
  },
};

function createStorage(): StorageAdapter {
  try {
    // Expo Go does not ship react-native-mmkv. Keep MMKV for dev/prod builds,
    // but fall back to in-memory storage so Expo Go can boot for manual testing.
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    return createMMKV({ id: 'tgmg-storage' });
  } catch {
    return fallbackStorage;
  }
}

export const storage = createStorage();
