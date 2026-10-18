import { Link } from 'react-router-dom';
import { paymentControl, usePaymentText } from './usePaymentText';
export default function PaymentsLink() {
  const { t } = usePaymentText();
  return (
    <Link className={paymentControl} to="/account/payments">
      {t('history')}
    </Link>
  );
}
