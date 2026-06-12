import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemTooltip from './ItemTooltip.jsx';
import { items } from '../data/gear-index.js';

const it1 = Object.values(items).find((i) => i.sources.length > 0);

describe('ItemTooltip', () => {
  it('renders item name, card slots, a drop line', () => {
    render(<ItemTooltip item={it1} />);
    expect(screen.getByText(new RegExp(it1.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    expect(screen.getByText(/card slot/i)).toBeInTheDocument();
    expect(screen.getByText(/drops:/i)).toBeInTheDocument();
  });

  it('renders a card tooltip with affix and slot', () => {
    render(<ItemTooltip item={{ kind: 'card', name: 'Angel Card', equipSlot: 'Weapon', affix: 'Blessed', description: 'A serene being.' }} />);
    expect(screen.getByText(/Angel Card/)).toBeInTheDocument();
    expect(screen.getByText(/Blessed/)).toBeInTheDocument();
    expect(screen.getByText(/Weapon/)).toBeInTheDocument();
  });
});
