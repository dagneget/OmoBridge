import { useSyncExternalStore } from 'react';
import { useAuthStore } from '../auth';
let revision = 0;
const listeners = new Set<() => void>();
const unsubscribe = useAuthStore.subscribe((next, previous) => {
  if (
    next.token !== previous.token ||
    next.user?.id !== previous.user?.id ||
    next.isAuthenticated !== previous.isAuthenticated
  ) {
    revision++;
    listeners.forEach((notify) => notify());
  }
});
const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};
export const getOrderScope = () => revision;
export function useOrderScope() {
  return useSyncExternalStore(subscribe, getOrderScope, getOrderScope);
}
if (import.meta.hot) import.meta.hot.dispose(unsubscribe);
