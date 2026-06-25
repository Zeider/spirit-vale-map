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

  it('colors primary Atk stat line with stat-atk class, Def in other group without stat-atk', () => {
    const { container } = render(<ItemTooltip item={{ name: 'X', type: 'Dagger', cardSlots: 0, statsPrimary: ['Atk: +20', 'Def: +5'], statsSecondary: [], setBonus: [], sources: [] }} />);
    const atk = [...container.querySelectorAll('.tip-stat')].find((e) => /Atk: \+20/.test(e.textContent));
    expect(atk.className).toMatch(/stat-atk/);
    const def = [...container.querySelectorAll('.tip-stat')].find((e) => /Def/.test(e.textContent));
    expect(def.className).not.toMatch(/stat-atk/);
  });

  it('renders card stat lines and colors Atk/Matk', () => {
    const { container } = render(<ItemTooltip item={{ kind: 'card', name: 'Cosmic Entity Card', equipSlot: 'Weapon', affix: 'Cosmic', description: 'eye', stats: ['+10% Atk', '-25% Max HP'] }} />);
    expect(screen.getByText('+10% Atk')).toBeInTheDocument();
    expect(screen.getByText('-25% Max HP')).toBeInTheDocument();
    const atk = [...container.querySelectorAll('.tip-stat')].find((e) => /Atk/.test(e.textContent));
    expect(atk.className).toMatch(/stat-atk/);
  });

  it('colors a skill-damage line yellow, primary Atk blue, secondary Atk green', () => {
    const { container } = render(<ItemTooltip item={{ name: 'W', type: 'Dagger', cardSlots: 0, statsPrimary: ['Atk: +10 +1 per refine'], statsSecondary: ['Atk: +3', 'Shadow Step Damage +15% +2% per refine'], setBonus: [], sources: [] }} />);
    const find = (re) => [...container.querySelectorAll('.tip-stat')].find((e) => re.test(e.textContent));
    expect(find(/Shadow Step Damage/).className).toMatch(/stat-skill/);
    expect(find(/Atk: \+10/).className).toMatch(/stat-atk/);
    const secondary = find(/Atk: \+3/);
    expect(secondary.className).not.toMatch(/stat-atk/);
    expect(secondary.className).not.toMatch(/stat-skill/);
  });

  it('renders a gem tooltip with affix + stats', () => {
    render(<ItemTooltip item={{ kind: 'gem', name: 'Ruby Gem', affix: 'Fiery', description: 'A red gem.', stats: ['+5% Atk'] }} />);
    expect(screen.getByText(/Ruby Gem/)).toBeInTheDocument();
    expect(screen.getByText(/Gem · Fiery/)).toBeInTheDocument();
    expect(screen.getByText('+5% Atk')).toBeInTheDocument();
  });

  it('renders an artifact set tooltip with per-piece + full-set stats', () => {
    render(<ItemTooltip item={{ name: 'Pioneer', description: 'A set.', perPiece: ['Atk: +5'], fullSet: ['All Stats: +1'] }} />);
    expect(screen.getByText('Pioneer')).toBeInTheDocument();
    expect(screen.getByText(/Artifact set/)).toBeInTheDocument();
    expect(screen.getByText('Atk: +5')).toBeInTheDocument();
    expect(screen.getByText(/Full set/)).toBeInTheDocument();
    expect(screen.getByText('All Stats: +1')).toBeInTheDocument();
  });

  it('shows the equipment set name', () => {
    render(<ItemTooltip item={{ name: 'Arcane Chest', type: 'Chest', cardSlots: 0, statsPrimary: [], statsSecondary: [], setBonus: [], sources: [], setName: 'Arcane' }} />);
    expect(screen.getByText(/Set: Arcane/)).toBeInTheDocument();
  });
});
