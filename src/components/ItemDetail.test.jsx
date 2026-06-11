import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemDetail from './ItemDetail.jsx';
import { StoreProvider } from '../state/store.jsx';
import { items } from '../data/gear-index.js';

const withSource = Object.values(items).find((i) => i.sources.length > 0);

describe('ItemDetail', () => {
  it('prompts when nothing selected', () => {
    render(<StoreProvider><ItemDetail /></StoreProvider>);
    expect(screen.getByText(/select a gear piece/i)).toBeInTheDocument();
  });
  it('shows the item name, sources and a farm button', () => {
    render(<StoreProvider init={{ selectedItemSlug: withSource.slug }}><ItemDetail /></StoreProvider>);
    expect(screen.getByRole('heading', { name: new RegExp(withSource.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument();
    expect(screen.getByText(/drop sources/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add .* zones? to route/i })).toBeInTheDocument();
  });
});
