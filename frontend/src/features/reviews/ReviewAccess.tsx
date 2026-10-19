import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthBootstrap, useAuthStore } from '../auth';
import { getOrderScope } from '../orders/sessionScope';
import RoleGuard from '../../routes/RoleGuard';
export default function ReviewAccess({ children }: { children: ReactNode }) {
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
            queryKey: ['buyer-reviews', previous.user?.id],
            predicate: (query) => query.queryKey[2] !== getOrderScope(),
          });
        }
      }),
    [client],
  );
  return <RoleGuard>{children}</RoleGuard>;
}
