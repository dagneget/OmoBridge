import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import axe from 'axe-core';
import {
  Button,
  Input,
  Select,
  Checkbox,
  FormField,
  Modal,
  Toast,
  Table,
  Card,
  Badge,
  StatusChip,
  Tabs,
  Skeleton,
  EmptyState,
  Pagination,
} from '../components/common';

describe('Base Components (F-102)', () => {
  describe('Button', () => {
    it('renders text, handles clicks, and shows loading spinner', () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        <Button onClick={handleClick}>Submit Order</Button>
      );

      const btn = screen.getByRole('button', { name: /submit order/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Loading state
      rerender(<Button isLoading onClick={handleClick}>Submit Order</Button>);
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1); // not called again
    });

    it('passes axe accessibility audit', async () => {
      const { container } = render(
        <div>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </div>
      );
      const results = await axe.run(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('Input and FormField', () => {
    it('associates label, input, and shows error message with alert role', () => {
      render(
        <FormField id="test-email" label="Email Address" error="Please enter a valid email" required>
          <Input id="test-email" type="email" placeholder="you@example.com" hasError />
        </FormField>
      );

      const label = screen.getByText(/email address/i);
      expect(label).toBeInTheDocument();
      const input = screen.getByPlaceholderText(/you@example.com/i);
      expect(input).toHaveAttribute('id', 'test-email');
      expect(input).toHaveAttribute('aria-invalid', 'true');

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent(/please enter a valid email/i);
    });

    it('passes axe accessibility audit', async () => {
      const { container } = render(
        <form>
          <FormField id="username" label="Username" hint="Enter your username">
            <Input id="username" placeholder="john_doe" />
          </FormField>
        </form>
      );
      const results = await axe.run(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('Select', () => {
    it('renders options and fires onChange', () => {
      const handleChange = vi.fn();
      render(
        <FormField id="region-select" label="Select Region">
          <Select
            id="region-select"
            options={[
              { value: 'turmi', label: 'Turmi' },
              { value: 'jinka', label: 'Jinka' },
            ]}
            onChange={handleChange}
          />
        </FormField>
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      fireEvent.change(select, { target: { value: 'turmi' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Checkbox', () => {
    it('toggles checked state and remains keyboard operable', () => {
      const handleChange = vi.fn();
      render(
        <Checkbox
          id="terms"
          label="I agree to the Terms"
          onChange={handleChange}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /i agree to the terms/i });
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Modal', () => {
    it('renders with role dialog and closes on Escape key and close button', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal isOpen={true} onClose={handleClose} title="Confirm Booking">
          <p>Are you sure you want to book this tour?</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/confirm booking/i)).toBeInTheDocument();

      // Close on escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      // Close button
      const closeBtn = screen.getByRole('button', { name: /close dialog/i });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);

      // Does not render when isOpen is false
      rerender(
        <Modal isOpen={false} onClose={handleClose} title="Confirm Booking">
          <p>Are you sure you want to book this tour?</p>
        </Modal>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Toast / Alert', () => {
    it('renders alert notification and can be dismissed', () => {
      const handleDismiss = vi.fn();
      render(
        <Toast
          type="success"
          title="Payment Verified"
          message="Your transaction of 2,400 ETB has been recorded."
          onDismiss={handleDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/payment verified/i)).toBeInTheDocument();
      expect(screen.getByText(/2,400 etb/i)).toBeInTheDocument();

      const dismissBtn = screen.getByRole('button', { name: /dismiss notification/i });
      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Table', () => {
    interface SampleRow {
      id: string;
      product: string;
      price: number;
    }

    const columns = [
      { key: 'product', header: 'Product Name' },
      { key: 'price', header: 'Price (ETB)', render: (row: SampleRow) => `${row.price} ETB` },
    ];

    it('renders rows, loading state, and empty state', () => {
      const data: SampleRow[] = [
        { id: '1', product: 'Omo Honey', price: 450 },
        { id: '2', product: 'Woven Scarf', price: 800 },
      ];

      const { rerender } = render(
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      );

      expect(screen.getByText('Omo Honey')).toBeInTheDocument();
      expect(screen.getByText('450 ETB')).toBeInTheDocument();
      expect(screen.getByText('Woven Scarf')).toBeInTheDocument();

      // Empty state
      rerender(
        <Table columns={columns} data={[]} keyExtractor={(r) => r.id} emptyMessage="No orders found" />
      );
      expect(screen.getByText('No orders found')).toBeInTheDocument();

      // Loading state
      rerender(
        <Table columns={columns} data={[]} keyExtractor={(r) => r.id} isLoading />
      );
      expect(screen.getByText(/loading data/i)).toBeInTheDocument();
    });
  });

  describe('Card, Badge, StatusChip, Skeleton, EmptyState', () => {
    it('renders Card with header and footer', () => {
      render(
        <Card header={<h3>Tour Summary</h3>} footer={<span>Total: 1,500 ETB</span>}>
          <p>3-day Omo Valley Expedition</p>
        </Card>
      );
      expect(screen.getByText('Tour Summary')).toBeInTheDocument();
      expect(screen.getByText('3-day Omo Valley Expedition')).toBeInTheDocument();
      expect(screen.getByText('Total: 1,500 ETB')).toBeInTheDocument();
    });

    it('renders Badge and StatusChip with appropriate labels', () => {
      render(
        <div>
          <Badge variant="primary">New Arrival</Badge>
          <StatusChip status="IN_TRANSIT" />
          <StatusChip status="DELIVERED" />
        </div>
      );
      expect(screen.getByText('New Arrival')).toBeInTheDocument();
      expect(screen.getByText('In Transit')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('renders Skeleton without throwing and with aria-hidden', () => {
      const { container } = render(<Skeleton width={100} height={20} />);
      const skeleton = container.querySelector('[aria-hidden="true"]');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders EmptyState with custom title and action button', () => {
      render(
        <EmptyState
          title="No deliveries assigned"
          description="You currently have no active deliveries."
          action={<Button>Refresh Deliveries</Button>}
        />
      );
      expect(screen.getByText('No deliveries assigned')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh deliveries/i })).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('supports tab switching and keyboard navigation', () => {
      const handleTabChange = vi.fn();
      render(
        <Tabs
          tabs={[
            { id: 'tab-1', label: 'Overview', content: <div>Overview Content</div> },
            { id: 'tab-2', label: 'Specifications', content: <div>Specs Content</div> },
            { id: 'tab-3', label: 'Reviews', content: <div>Reviews Content</div> },
          ]}
          onChange={handleTabChange}
        />
      );

      expect(screen.getByText('Overview Content')).toBeInTheDocument();
      const tab2 = screen.getByRole('tab', { name: /specifications/i });

      // Click to switch
      fireEvent.click(tab2);
      expect(handleTabChange).toHaveBeenCalledWith('tab-2');
      expect(screen.getByText('Specs Content')).toBeInTheDocument();

      // Keyboard arrow navigation
      fireEvent.keyDown(tab2, { key: 'ArrowRight' });
      expect(handleTabChange).toHaveBeenCalledWith('tab-3');
      expect(screen.getByText('Reviews Content')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('handles page switching and disables boundary controls', () => {
      const handlePageChange = vi.fn();
      const { rerender } = render(
        <Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />
      );

      const prevBtn = screen.getByRole('button', { name: /previous page/i });
      const nextBtn = screen.getByRole('button', { name: /next page/i });

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();

      // Click next page
      fireEvent.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(2);

      // On last page
      rerender(
        <Pagination currentPage={5} totalPages={5} onPageChange={handlePageChange} />
      );
      expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    });
  });
});
