import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BuildCard from './BuildCard.jsx';

const row = { id: 'b1', name: 'Frost Mage', base_class: 'mage', advanced_class: 'wizard',
  role: ['DPS'], content: ['Endgame'], like_count: 7, created_at: '2026-06-21T00:00:00Z' };

describe('BuildCard', () => {
  it('shows title, class, tags, likes and opens on click', () => {
    const onOpen = vi.fn();
    render(<BuildCard build={row} onOpen={onOpen} />);
    expect(screen.getByText('Frost Mage')).toBeInTheDocument();
    expect(screen.getByText(/Mage · Wizard/)).toBeInTheDocument();
    expect(screen.getByText('DPS')).toBeInTheDocument();
    expect(screen.getByText('Endgame')).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open Frost Mage/i }));
    expect(onOpen).toHaveBeenCalledWith('b1');
  });
});
