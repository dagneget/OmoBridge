import { useParams } from 'react-router-dom';
import { ProductDetail } from '../../features/products';

export default function ProductDetailsPage() {
  const { id = '' } = useParams();
  return <ProductDetail id={id} />;
}
