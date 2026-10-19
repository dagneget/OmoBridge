import PaymentAccess from '../../features/payments/PaymentAccess';
import PaymentHistory from '../../features/payments/PaymentHistory';
export default function PaymentsPage() {
  return (
    <PaymentAccess>
      <PaymentHistory />
    </PaymentAccess>
  );
}
