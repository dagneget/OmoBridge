import { useEffect, useRef } from 'react';
import RoleGuard from '../../routes/RoleGuard';
import { useAuthStore } from '../../features/auth';
import { CheckoutForm } from '../../features/checkout';

export default function CheckoutPage() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const started = useRef(false);
  useEffect(() => {
    if (isLoading && !started.current) {
      started.current = true;
      void bootstrap();
    }
  }, [isLoading, bootstrap]);
  return (
    <RoleGuard>
      <CheckoutForm />
    </RoleGuard>
  );
}
