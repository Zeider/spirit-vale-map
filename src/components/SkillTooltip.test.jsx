import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillTooltip from './SkillTooltip.jsx';

describe('SkillTooltip', () => {
  const heal = { id: 'heal', name: 'Heal', isPassive: false, maxLevel: 5, description: 'Restores HP.',
    cost: { base: 10, level: 5 }, cooldown: { base: 1, level: 0 }, damage: null, requirements: [] };

  it('shows name, badge, description and Lv1→LvMax scaling', () => {
    render(<SkillTooltip skill={heal} />);
    expect(screen.getByText('Heal')).toBeInTheDocument();
    expect(screen.getByText(/SKILL · max 5/)).toBeInTheDocument();
    expect(screen.getByText('Restores HP.')).toBeInTheDocument();
    expect(screen.getByText(/Lv1 10 → Lv5 30/)).toBeInTheDocument(); // cost: 10 + 5*(5-1)
  });

  it('lists requirements by skill name', () => {
    const gated = { ...heal, requirements: [{ id: 'heal', level: 3 }] };
    render(<SkillTooltip skill={gated} />);
    expect(screen.getByText(/Requires: Heal Lv3/)).toBeInTheDocument();
  });

  it('renders nothing without a skill', () => {
    const { container } = render(<SkillTooltip skill={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
