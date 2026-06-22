import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';
import SkillTree from './SkillTree.jsx';
import GearProgression from './GearProgression.jsx';
import BuildNotes from './BuildNotes.jsx';

const ro = (ui, build) => render(<StoreProvider init={{ readOnly: true, build }}>{ui}</StoreProvider>);
const baseBuild = { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: 'farm **hard**', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } };

describe('read-only planner', () => {
  it('SkillTree disables its skill steppers', () => {
    ro(<SkillTree classSlug="mage" tree="base" />, baseBuild);
    // every increment/decrement control is disabled in read-only
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
  it('GearProgression hides the add-gear-stage control', () => {
    ro(<GearProgression />, baseBuild);
    expect(screen.queryByText(/add gear stage/i)).toBeNull();
  });
  it('BuildNotes renders notes without the editor toggle', () => {
    ro(<BuildNotes />, baseBuild);
    expect(screen.queryByRole('button', { name: /preview|edit/i })).toBeNull();
    expect(screen.getByText('hard')).toBeInTheDocument(); // markdown rendered
  });
});
