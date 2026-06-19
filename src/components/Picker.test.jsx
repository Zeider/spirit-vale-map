import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Picker from './Picker.jsx';

const opts = [{ key: 'a', name: 'Alpha' }, { key: 'b', name: 'Beta' }];

describe('Picker', () => {
  it('filters by search and picks an option', () => {
    const onPick = vi.fn();
    render(<Picker title="Pick" options={opts} value={null} onPick={onPick} onClose={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bet' } });
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Beta'));
    expect(onPick).toHaveBeenCalledWith('b');
  });
  it('matches the full search text (stats), not just the name', () => {
    const statOpts = [
      { key: 'bee', name: 'Bee Card', hint: '+25 Hit', search: 'Bee Card +25 Hit' },
      { key: 'angel', name: 'Angel Card', hint: '+10% healing', search: 'Angel Card +10% healing' },
    ];
    render(<Picker title="Pick" options={statOpts} value={null} onPick={() => {}} onClose={() => {}} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'hit' } });
    expect(screen.getByText('Bee Card')).toBeInTheDocument(); // matched via stat, not name
    expect(screen.queryByText('Angel Card')).not.toBeInTheDocument();
  });
  it('offers a clear/none option', () => {
    const onPick = vi.fn();
    render(<Picker title="Pick" options={opts} value="a" onPick={onPick} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /none/i }));
    expect(onPick).toHaveBeenCalledWith(null);
  });
});
