import { getOrderScope } from './sessionScope';
import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthBootstrap, useAuthStore } from '../auth';
import RoleGuard from '../../routes/RoleGuard';
export function OrderAccess({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  useAuthBootstrap();
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
