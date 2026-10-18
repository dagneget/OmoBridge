import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createQueryClient, queryInvalidators, type PageResponse } from '../services/queryClient';
import { queryKeys } from '../services/queryKeys';

interface TestItem {
  id: string;
  name: string;
}

// Sample fetcher that paginates
const mockFetchItems = vi.fn(async (page: number): Promise<PageResponse<TestItem>> => {
  return {
    content: [
      { id: `item-${page}-1`, name: `Product Page ${page} Item 1` },
      { id: `item-${page}-2`, name: `Product Page ${page} Item 2` },
    ],
    number: page,
    size: 2,
    totalElements: 4,
    totalPages: 2,
    first: page === 0,
    last: page === 1,
    empty: false,
  };
});

function PaginatedTestComponent() {
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.products.list({ page }),
    queryFn: () => mockFetchItems(page),
  });

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
      <div data-testid="is-fetching">{isFetching ? 'Fetching' : 'Idle'}</div>
      <div data-testid="page-number">Page {data?.number}</div>
      <ul>
        {data?.content.map((item) => (
          <li key={item.id} data-testid="product-item">
            {item.name}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={data?.last}
        onClick={() => setPage((p) => p + 1)}
      >
        Next Page
      </button>
    </div>
  );
}

describe('Server-state layer and TanStack Query (F-006)', () => {
  it('paginates a list query and refetches upon cache invalidation', async () => {
    const testClient = createQueryClient();
    mockFetchItems.mockClear();

    render(
      <QueryClientProvider client={testClient}>
        <PaginatedTestComponent />
      </QueryClientProvider>
    );

    // Initial page 0 load
    expect(await screen.findByText('Product Page 0 Item 1')).toBeInTheDocument();
    expect(screen.getByText('Page 0')).toBeInTheDocument();
    expect(mockFetchItems).toHaveBeenCalledTimes(1);
    expect(mockFetchItems).toHaveBeenCalledWith(0);

    // Paginate to page 1
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn);

    expect(await screen.findByText('Product Page 1 Item 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(mockFetchItems).toHaveBeenCalledTimes(2);
    expect(mockFetchItems).toHaveBeenCalledWith(1);

    // Test query invalidation trigger
    queryInvalidators.invalidateProducts(testClient);

    await waitFor(() => {
      // Re-fetched active query for page 1
      expect(mockFetchItems).toHaveBeenCalledTimes(3);
    });
  });
});
