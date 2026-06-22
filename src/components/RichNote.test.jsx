import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RichNote from './RichNote.jsx';

function Harness({ initial = '' }) {
  const [v, setV] = useState(initial);
  return <RichNote value={v} onChange={(e) => setV(e.target.value)} />;
}

describe('RichNote', () => {
  it('renders markdown by default when there is content', () => {
    render(<Harness initial="**hi**" />);
    expect(screen.getByText('hi').tagName).toBe('STRONG'); // rendered, not raw markdown
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('starts in edit mode when empty', () => {
    render(<Harness initial="" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  it('bold button wraps the selection in ** (after entering edit)', () => {
    render(<Harness initial="hi" />);
    fireEvent.click(screen.getByRole('button', { name: /edit/i })); // content starts rendered
    const ta = screen.getByRole('textbox');
    ta.setSelectionRange(0, 2);
    fireEvent.select(ta);
    fireEvent.click(screen.getByRole('button', { name: 'bold' }));
    expect(ta.value).toBe('**hi**');
  });
});
