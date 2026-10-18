/**
 * Query Key Factory for TanStack Query
 * Organizes cache keys hierarchically for precise invalidation and caching.
 */
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: () => [...queryKeys.auth.all, 'profile'] as const,
  },
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.products.lists(), filters || {}] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    types: () => [...queryKeys.products.all, 'types'] as const,
  },
  tourism: {
    all: ['tourism'] as const,
    packages: {
      all: () => [...queryKeys.tourism.all, 'packages'] as const,
      list: (filters?: Record<string, unknown>) => [...queryKeys.tourism.packages.all(), 'list', filters || {}] as const,
      detail: (id: string) => [...queryKeys.tourism.packages.all(), 'detail', id] as const,
    },
    hotels: {
      all: () => [...queryKeys.tourism.all, 'hotels'] as const,
      list: () => [...queryKeys.tourism.hotels.all(), 'list'] as const,
      detail: (id: string) => [...queryKeys.tourism.hotels.all(), 'detail', id] as const,
    },
    guides: {
      all: () => [...queryKeys.tourism.all, 'guides'] as const,
      list: () => [...queryKeys.tourism.guides.all(), 'list'] as const,
      detail: (id: string) => [...queryKeys.tourism.guides.all(), 'detail', id] as const,
    },
    transport: {
      all: () => [...queryKeys.tourism.all, 'transport'] as const,
      list: () => [...queryKeys.tourism.transport.all(), 'list'] as const,
    },
    guidelines: {
      all: () => [...queryKeys.tourism.all, 'guidelines'] as const,
      list: () => [...queryKeys.tourism.guidelines.all(), 'list'] as const,
    },
  },
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.bookings.lists(), filters || {}] as const,
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.orders.lists(), filters || {}] as const,
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    detail: (orderOrBookingId: string) => [...queryKeys.payments.all, 'detail', orderOrBookingId] as const,
  },
  delivery: {
    all: ['delivery'] as const,
    jobs: {
      all: () => [...queryKeys.delivery.all, 'jobs'] as const,
      list: (status?: string) => [...queryKeys.delivery.jobs.all(), 'list', status || 'all'] as const,
      detail: (id: string) => [...queryKeys.delivery.jobs.all(), 'detail', id] as const,
    },
    tracking: (token: string) => [...queryKeys.delivery.all, 'track', token] as const,
  },
  supply: {
    all: ['supply'] as const,
    deliveries: (filters?: Record<string, unknown>) => [...queryKeys.supply.all, 'deliveries', filters || {}] as const,
    payables: (filters?: Record<string, unknown>) => [...queryKeys.supply.all, 'payables', filters || {}] as const,
    balance: (farmerId: string) => [...queryKeys.supply.all, 'balance', farmerId] as const,
  },
  traceability: {
    all: ['traceability'] as const,
    batches: (filters?: Record<string, unknown>) => [...queryKeys.traceability.all, 'batches', filters || {}] as const,
    publicTrace: (publicToken: string) => [...queryKeys.traceability.all, 'public', publicToken] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    forTarget: (targetType: string, targetId: string) => [...queryKeys.reviews.all, targetType, targetId] as const,
    summary: (targetType: string, targetId: string) => [...queryKeys.reviews.all, 'summary', targetType, targetId] as const,
  },
};
