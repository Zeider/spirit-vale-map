import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RichNote from './RichNote.jsx';

function Harness({ initial = '' }) {
  const [v, setV] = useState(initial);
  return <RichNote value={v} onChange={(e) => setV(e.target.value)} />;
}

describe('RichNote', () => {
  it('bold button wraps the selection in **', () => {
    render(<Harness initial="hi" />);
    const ta = screen.getByRole('textbox');
    ta.setSelectionRange(0, 2);
    fireEvent.select(ta);
    fireEvent.click(screen.getByRole('button', { name: 'bold' }));
    expect(ta.value).toBe('**hi**');
  });
  it('Preview renders the markdown', () => {
    render(<Harness initial="**hi**" />);
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.getByText('hi').tagName).toBe('STRONG');
  });
});
