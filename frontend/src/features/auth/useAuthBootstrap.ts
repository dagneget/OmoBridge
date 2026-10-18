import { useEffect } from 'react';
import { TOKEN_STORAGE_KEY } from '../../services/httpClient';
import { useAuthStore } from './authStore';

let active: { token: string | null; bootstrap: () => Promise<void>; promise: Promise<void> } | undefined;
function verifyStoredSession() {
  const state = useAuthStore.getState();
  if (!state.isLoading) return;
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (active?.token === token && active.bootstrap === state.bootstrap) return;
  const promise = state.bootstrap();
  active = { token, bootstrap: state.bootstrap, promise };
  const clear = () => { if (active?.promise === promise) active = undefined; };
  void promise.then(clear, clear);
}
/** App startup and nested guards share one verification, including React StrictMode. */
export function useAuthBootstrap() {
  const loading = useAuthStore((state) => state.isLoading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  useEffect(() => { if (loading) verifyStoredSession(); }, [loading, bootstrap]);
}
