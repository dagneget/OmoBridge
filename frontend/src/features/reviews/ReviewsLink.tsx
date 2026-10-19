import { Link } from 'react-router-dom';
import { reviewControl, useReviewsText } from './useReviewsText';
export default function ReviewsLink() {
  const t = useReviewsText();
  return (
    <Link className={reviewControl} to="/account/reviews">
      {t('history')}
    </Link>
  );
}
