type StorageAdapter = {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: string | boolean | number) => void;
  remove: (key: string) => void;
};

const memoryStorage = new Map<string, string>();

const fallbackStorage: StorageAdapter = {
  getString: (key) => memoryStorage.get(key),
  getBoolean: (key) => {
    const raw = memoryStorage.get(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return undefined;
  },
  set: (key, value) => {
    memoryStorage.set(key, String(value));
  },
  remove: (key) => {
    memoryStorage.delete(key);
  },
};

function createStorage(): StorageAdapter {
  try {
    // Expo Go does not ship react-native-mmkv. Keep MMKV for dev/prod builds,
    // but fall back to in-memory storage so Expo Go can boot for manual testing.
    const mmkvPackage = require('react-native-mmkv') as {
      createMMKV?: (options?: { id?: string }) => {
        getString: (key: string) => string | undefined;
        getBoolean: (key: string) => boolean | undefined;
        set: (key: string, value: string | boolean | number) => void;
        delete: (key: string) => void;
      };
      MMKV?: new (options?: { id?: string }) => {
        getString: (key: string) => string | undefined;
        getBoolean: (key: string) => boolean | undefined;
        set: (key: string, value: string | boolean | number) => void;
        delete: (key: string) => void;
      };
    };
    const mmkv =
      mmkvPackage.createMMKV?.({ id: 'tgmg-storage' }) ??
      (mmkvPackage.MMKV ? new mmkvPackage.MMKV({ id: 'tgmg-storage' }) : null);
    if (!mmkv) return fallbackStorage;
    return {
      getString: (key) => mmkv.getString(key),
      getBoolean: (key) => mmkv.getBoolean(key),
      set: (key, value) => mmkv.set(key, value),
      remove: (key) => mmkv.delete(key),
    };
  } catch {
    return fallbackStorage;
  }
}

export const storage = createStorage();
