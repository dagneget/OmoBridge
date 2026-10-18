import { getOrderScope } from './sessionScope';
import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth';
import RoleGuard from '../../routes/RoleGuard';
export function OrderAccess({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const loading = useAuthStore((state) => state.isLoading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const started = useRef(false);
  useEffect(() => {
    if (loading && !started.current) {
      started.current = true;
      void bootstrap();
    }
  }, [loading, bootstrap]);
  useEffect(
    () =>
      useAuthStore.subscribe((next, previous) => {
        if (
          next.token !== previous.token ||
          next.user?.id !== previous.user?.id ||
          !next.isAuthenticated
        ) {
          client.removeQueries({
            queryKey: ['buyer-orders', previous.user?.id],
            predicate: (query) => query.queryKey[2] !== getOrderScope(),
          });
        }
      }),
    [client],
  );
  return <RoleGuard>{children}</RoleGuard>;
}
