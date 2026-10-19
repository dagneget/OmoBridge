import { useQuery } from '@tanstack/react-query';
import { Star, Wallet } from 'lucide-react';
import { Card } from '../../../components/common';
import { guideKeys, guideService } from '../../../features/guide/guideService';

const ratingLabel = (rating?: number) => `${rating ?? 0} out of 5 stars`;

function Stars({ rating }: { rating?: number }) {
  const value = rating ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={ratingLabel(rating)}>
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={`w-3.5 h-3.5 ${step <= Math.round(value) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function GuideReviewsPage() {
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: guideKeys.profile(),
    queryFn: () => guideService.getMyProfile(),
  });

  const guideId = profile?.id;

  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: guideKeys.reviews(guideId ?? 'none'),
    queryFn: () => guideService.getMyReviews(guideId as string),
    enabled: Boolean(guideId),
  });

  if (profileLoading || (isLoading && guideId)) {
    return (
      <Card className="p-6 space-y-3" data-testid="guide-reviews-loading">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
        <div className="h-20 w-full rounded bg-muted animate-pulse" />
      </Card>
    );
  }

  if (profileError || isError) {
    return (
      <Card className="p-6 space-y-3" data-testid="guide-reviews-error">
        <h2 className="text-lg font-bold text-foreground">Reviews unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Your reviews could not be loaded.'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Try again
        </button>
      </Card>
    );
  }

  const reviews = summary?.reviews ?? [];

  return (
    <div className="space-y-6" data-testid="guide-reviews">
      <div>
        <h2 className="text-lg font-bold text-foreground">Reviews &amp; Payments</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Feedback from visitors you have guided.
        </p>
      </div>

      <Card className="p-5 flex flex-wrap items-center gap-6">
        <div>
          <span className="text-xs text-muted-foreground">Average rating</span>
          <p className="text-2xl font-bold text-foreground" data-testid="guide-reviews-average">
            {(summary?.averageRating ?? 0).toFixed(1)}
          </p>
          <Stars rating={summary?.averageRating} />
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Total reviews</span>
          <p className="text-2xl font-bold text-foreground" data-testid="guide-reviews-total">
            {summary?.totalReviews ?? 0}
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-3" data-testid="guide-payments-unavailable">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          Payment records
        </h3>
        <p className="text-sm text-muted-foreground">
          Payment records are not shown yet. The backend does not expose a guide payments endpoint,
          so nothing is displayed rather than guessing at amounts. See gap F-1203-P1 in the project
          plan.
        </p>
      </Card>

      {reviews.length === 0 ? (
        <Card className="p-8 text-center" data-testid="guide-reviews-none">
          <Star className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground mt-3">No reviews yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Reviews from visitors will appear here after completed tours.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card className="p-4 space-y-2" data-testid="guide-review-item">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-medium text-foreground">
                    {review.reviewerName || 'Anonymous visitor'}
                  </span>
                  <Stars rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
                {review.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
