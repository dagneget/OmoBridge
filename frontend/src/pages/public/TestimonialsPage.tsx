import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquareQuote,
  Star,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  ShoppingBag,
  Sparkles,
  Building,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Skeleton,
  EmptyState,
} from '../../components/common';
import { reviewService } from '../../features/reviews/reviewService';
import { queryKeys } from '../../services/queryKeys';
import { formatDateTime } from '../../utils/formatters';
import type { ReviewResponse } from '../../types/api';

const TARGET_TYPES = [
  { key: 'ALL', label: 'All Reviews', icon: Star },
  { key: 'EXPERIENCE', label: 'Cultural Tours', icon: Compass },
  { key: 'GUIDE', label: 'Guides', icon: Sparkles },
  { key: 'PRODUCT', label: 'Artisan Goods', icon: ShoppingBag },
  { key: 'ENTERPRISE', label: 'Enterprises', icon: Building },
] as const;

export default function TestimonialsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<number>(0);

  const {
    data: testimonials = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ReviewResponse[]>({
    queryKey: queryKeys.reviews.testimonials(),
    queryFn: () => reviewService.getTestimonials(),
  });

  // Calculate rating statistics
  const stats = useMemo(() => {
    if (!testimonials.length) return { average: 0, total: 0, ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    const total = testimonials.length;
    let sum = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    testimonials.forEach((rev) => {
      const r = Math.min(5, Math.max(1, rev.rating || 5)) as 1 | 2 | 3 | 4 | 5;
      counts[r] = (counts[r] || 0) + 1;
      sum += r;
    });

    const average = Number((sum / total).toFixed(1));
    return { average, total, ratingCounts: counts };
  }, [testimonials]);

  // Filtered reviews
  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((rev) => {
      // Filter by target type
      if (selectedTarget !== 'ALL' && rev.targetType !== selectedTarget) {
        return false;
      }

      // Filter by rating
      if (minRating > 0 && (rev.rating || 0) < minRating) {
        return false;
      }

      // Filter by search keyword
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = rev.reviewerName?.toLowerCase().includes(query);
        const matchesComment = rev.comment?.toLowerCase().includes(query);
        if (!matchesName && !matchesComment) return false;
      }

      return true;
    });
  }, [testimonials, selectedTarget, minRating, searchQuery]);

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in"
      data-testid="testimonials-page"
    >
      {/* Header */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Verified Visitor Testimonials</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Visitor Experiences & Stories
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Authentic feedback and verified ratings from travelers who booked community ceremonies, cultural treks, and local goods directly through OmoBridge.
        </p>
      </div>

      {/* Summary Averages Banner (only shown if testimonials exist) */}
      {!isLoading && !isError && testimonials.length > 0 && (
        <Card className="p-6 bg-primary/5 border-primary/20 space-y-4" data-testid="testimonials-summary">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl sm:text-5xl font-black text-foreground font-mono" data-testid="average-rating">
                {stats.average}
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-amber-500 gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(stats.average)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on <strong className="text-foreground" data-testid="total-reviews">{stats.total}</strong> verified visitor reviews
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3.5 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>100% post-trip verified community reviews</span>
            </div>
          </div>
        </Card>
      )}

      {/* Controls: Category Filter and Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Input
              type="text"
              placeholder="Search comments or traveler names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:text-foreground text-muted-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Rating filter dropdown/buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[0, 5, 4].map((rating) => {
              const isSelected = minRating === rating;
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setMinRating(rating)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-target ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card hover:bg-muted text-muted-foreground border border-border'
                  }`}
                  data-testid={`filter-rating-${rating}`}
                >
                  {rating === 0 ? 'All Ratings' : `${rating} Stars only`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TARGET_TYPES.map((type) => {
            const isSelected = selectedTarget === type.key;
            return (
              <button
                key={type.key}
                type="button"
                onClick={() => setSelectedTarget(type.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-target flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50'
                }`}
                data-testid={`filter-category-${type.key.toLowerCase()}`}
              >
                {type.icon && <type.icon className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="testimonials-loading">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          className="p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3"
          role="alert"
          data-testid="testimonials-error"
        >
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">Could Not Load Testimonials</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error instanceof Error ? error.message : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Loading
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredTestimonials.length === 0 && (
        <div data-testid="testimonials-empty">
          <EmptyState
            title="No reviews yet"
            description={
              searchQuery || selectedTarget !== 'ALL' || minRating > 0
                ? 'No visitor reviews match your current filters.'
                : 'Verified visitor feedback will appear here as tours and orders conclude.'
            }
            action={
              searchQuery || selectedTarget !== 'ALL' || minRating > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTarget('ALL');
                    setMinRating(0);
                  }}
                  data-testid="reset-testimonials-filter"
                >
                  Reset Filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Testimonials Grid */}
      {!isLoading && !isError && filteredTestimonials.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="testimonials-grid">
          {filteredTestimonials.map((rev, idx) => {
            const cardId = rev.id || `rev-${idx}`;
            const rating = rev.rating || 5;

            return (
              <Card
                key={cardId}
                className="flex flex-col justify-between p-6 hover:shadow-lg transition-all border-border/80"
                data-testid={`testimonial-card-${cardId}`}
              >
                <div className="space-y-3">
                  {/* Rating Stars & Target Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center text-amber-500 gap-0.5" data-testid={`rating-${cardId}`}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    {rev.targetType && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                        {rev.targetType}
                      </span>
                    )}
                  </div>

                  {/* Comment Quote */}
                  {rev.comment && (
                    <p className="text-sm text-foreground/90 leading-relaxed italic">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  )}
                </div>

                {/* Reviewer Info & Date */}
                <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    <strong className="text-foreground block">{rev.reviewerName || 'Verified Guest'}</strong>
                    {rev.createdAt && (
                      <span className="text-[11px]">{formatDateTime(rev.createdAt, 'dateOnly')}</span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Verified</span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
