import { OrderAccess, OrdersList } from '../../features/orders';
export default function OrdersPage() {
  return (
    <OrderAccess>
      <OrdersList />
    </OrderAccess>
  );
}
