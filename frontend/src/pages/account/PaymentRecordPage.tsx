import PaymentAccess from '../../features/payments/PaymentAccess';
import PaymentRecord from '../../features/payments/PaymentRecord';
export default function PaymentRecordPage() {
  return (
    <PaymentAccess>
      <PaymentRecord />
    </PaymentAccess>
  );
}
