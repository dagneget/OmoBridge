import { useParams } from 'react-router-dom';
import { OrderAccess, OrderDetail } from '../../features/orders';
export default function OrderDetailPage() {
  const { id } = useParams();
  return (
    <OrderAccess>
      <OrderDetail id={id} />
    </OrderAccess>
  );
}
