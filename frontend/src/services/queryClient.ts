import { QueryClient } from '@tanstack/react-query';
import { NormalizedApiError } from './apiError';
import { queryKeys } from './queryKeys';

// Stale times tailored for metered mobile connectivity in rural Ethiopia
export const STALE_TIMES = {
  PUBLIC_CATALOG: 5 * 60 * 1000, // 5 minutes (packages, hotels, products)
  STATIC_INFO: 30 * 60 * 1000,   // 30 minutes (guidelines, transport routes)
  USER_PRIVATE: 30 * 1000,       // 30 seconds (orders, bookings, deliveries)
  REALTIME_ACTIVE: 5 * 1000,     // 5 seconds (active GPS tracking polling fallback)
};

/**
 * Creates a configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.PUBLIC_CATALOG,
        gcTime: 15 * 60 * 1000, // Keep in memory 15 mins for offline navigation
        refetchOnWindowFocus: false, // Save bandwidth on mobile connections
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Do not retry 4xx client errors (401, 403, 404, 409, 422)
          if (error instanceof NormalizedApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false, // Never retry mutations automatically to avoid duplicate charges or orders
      },
    },
  });
}

export const queryClient = createQueryClient();

// Spring Boot Pageable Envelope
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Cache Invalidation Helpers
 */
export const queryInvalidators = {
  invalidateAuth: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.auth.all }),

  invalidateProducts: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.products.all }),

  invalidateTourism: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.tourism.all }),

  invalidateBookings: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.bookings.all }),

  invalidateOrders: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.orders.all }),

  invalidateDeliveries: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.delivery.all }),

  invalidateSupply: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.supply.all }),

  invalidateTraceability: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.traceability.all }),

  invalidateReviews: (client: QueryClient = queryClient) =>
    client.invalidateQueries({ queryKey: queryKeys.reviews.all }),
};
