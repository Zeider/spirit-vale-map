import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillCard from './SkillCard.jsx';

const skill = { id: 'heal', name: 'Heal', maxLevel: 5, isPassive: false, requirements: [] };

describe('SkillCard', () => {
  it('renders name, level/max and a badge', () => {
    render(<SkillCard skill={skill} level={2} canInc canDec onChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByText('Heal')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText(/skill/i)).toBeInTheDocument();
  });
  it('+ calls onChange with level+1 and is disabled when !canInc', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SkillCard skill={skill} level={2} canInc canDec onChange={onChange} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /increase heal/i }));
    expect(onChange).toHaveBeenCalledWith(3);
    rerender(<SkillCard skill={skill} level={2} canInc={false} canDec onChange={onChange} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /increase heal/i })).toBeDisabled();
  });
});
