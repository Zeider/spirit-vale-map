import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoreProvider } from '../state/store.jsx';
import SkillTree from './SkillTree.jsx';
import GearProgression from './GearProgression.jsx';
import BuildNotes from './BuildNotes.jsx';

const ro = (ui, build) => render(<StoreProvider init={{ readOnly: true, build }}>{ui}</StoreProvider>);
const rw = (ui, build) => render(<StoreProvider init={{ readOnly: false, build }}>{ui}</StoreProvider>);
const baseBuild = { baseClass: 'mage', advancedClass: null, levels: {}, gearStages: [], notes: 'farm **hard**', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } };
const buildWithStage = { ...baseBuild, gearStages: [{ toLevel: 30 }] };

describe('read-only planner', () => {
  it('SkillTree disables its skill steppers', () => {
    ro(<SkillTree classSlug="mage" tree="base" />, baseBuild);
    // every increment/decrement control is disabled in read-only
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });

  it('GearProgression hides the add-stage button in read-only', () => {
    ro(<GearProgression />, baseBuild);
    // AddGearStage renders a button with label "＋ Add stage" — must be absent in read-only
    expect(screen.queryByRole('button', { name: /add stage/i })).toBeNull();
  });

  it('GearProgression shows the add-stage button when NOT read-only', () => {
    rw(<GearProgression />, baseBuild);
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
  });

  it('GearStageRail hides cap-edit and remove-stage buttons in read-only', () => {
    ro(<GearProgression />, buildWithStage);
    // "Edit cap" button should be absent
    expect(screen.queryByTitle('Edit cap')).toBeNull();
    // remove-stage button (aria-label starts with "remove stage") should be absent
    expect(screen.queryByRole('button', { name: /remove stage/i })).toBeNull();
  });

  it('GearStageRail shows cap-edit and remove-stage buttons when NOT read-only', () => {
    rw(<GearProgression />, buildWithStage);
    expect(screen.getByTitle('Edit cap')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove stage/i })).toBeInTheDocument();
  });

  it('BuildNotes renders notes without the editor toggle', () => {
    ro(<BuildNotes />, baseBuild);
    expect(screen.queryByRole('button', { name: /preview|edit/i })).toBeNull();
    expect(screen.getByText('hard')).toBeInTheDocument(); // markdown rendered
  });
});
