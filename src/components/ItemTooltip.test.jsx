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

  it('colors Atk/Matk stat lines with the stat-atk class', () => {
    const { container } = render(<ItemTooltip item={{ name: 'X', type: 'Dagger', cardSlots: 0, statsPrimary: ['Atk: +20', 'Def: +5'], statsSecondary: [], setBonus: [], sources: [] }} />);
    const atk = [...container.querySelectorAll('.tip-stat')].find((e) => /Atk/.test(e.textContent));
    expect(atk.className).toMatch(/stat-atk/);
    const def = [...container.querySelectorAll('.tip-stat')].find((e) => /Def/.test(e.textContent));
    expect(def.className).not.toMatch(/stat-atk/);
  });
});
