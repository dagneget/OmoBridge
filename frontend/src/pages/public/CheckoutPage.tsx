import RoleGuard from '../../routes/RoleGuard';
import { useAuthBootstrap } from '../../features/auth';
import { CheckoutForm } from '../../features/checkout';

export default function CheckoutPage() {
  useAuthBootstrap();
  return (
    <RoleGuard>
      <CheckoutForm />
    </RoleGuard>
  );
}
