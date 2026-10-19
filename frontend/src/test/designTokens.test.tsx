import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DesignTokensPage from '../pages/public/DesignTokensPage';

describe('Design Tokens and Styling (F-003)', () => {
  it('renders the design tokens showcase page', () => {
    render(<DesignTokensPage />);
    expect(screen.getByTestId('design-tokens-page')).toBeInTheDocument();
    expect(screen.getByText('OmoBridge Design Tokens')).toBeInTheDocument();
  });

  it('renders Amharic text with Ethiopic script correctly', () => {
    render(<DesignTokensPage />);
    const amharicHeading = screen.getByTestId('amharic-heading');
    expect(amharicHeading).toBeInTheDocument();
    expect(amharicHeading.textContent).toContain('ኦሞብሪጅ');
    expect(amharicHeading).toHaveClass('font-ethiopic');

    const amharicBody = screen.getByTestId('amharic-body');
    expect(amharicBody).toBeInTheDocument();
    expect(amharicBody.textContent).toContain('የአርሶ አደሮች ምርት');
  });

  it('toggles light and dark themes and updates html attributes', () => {
    render(<DesignTokensPage />);
    const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    fireEvent.click(toggleBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(toggleBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('ensures touch targets have the minimum 44px touch-target class', () => {
    render(<DesignTokensPage />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn).toHaveClass('touch-target');
    });
  });
});
