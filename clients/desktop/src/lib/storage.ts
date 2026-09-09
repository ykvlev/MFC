/**
 * Хранилище токенов. В Tauri — защищённый plugin-store (OS keychain-подобно),
 * в обычном браузере (vite dev / preview) — localStorage.
 */
type Store = { get(k: string): Promise<string | null>; set(k: string, v: string | null): Promise<void> };

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const webStore: Store = {
  async get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  async set(k, v) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};

let tauriStore: Store | null = null;
async function getStore(): Promise<Store> {
  if (!isTauri()) return webStore;
  if (tauriStore) return tauriStore;
  const { load } = await import('@tauri-apps/plugin-store');
  const s = await load('auth.json', { autoSave: true });
  tauriStore = {
    async get(k) {
      return ((await s.get<string>(k)) as string | undefined) ?? null;
    },
    async set(k, v) {
      if (v === null) await s.delete(k);
      else await s.set(k, v);
      await s.save();
    },
  };
  return tauriStore;
}

export const tokenStore = {
  async getRefresh() {
    return (await getStore()).get('refreshToken');
  },
  async setRefresh(v: string | null) {
    return (await getStore()).set('refreshToken', v);
  },
};
