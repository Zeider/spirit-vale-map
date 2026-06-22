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
// Stage with an equipped weapon and a rune artifact so StatSheet and ArtifactPanel render fully
const buildWithGearAndArtifact = {
  ...baseBuild,
  gearStages: [{
    toLevel: 30,
    changes: { weapon: 'abyss-shard' },
    artifacts: { rune: { set: 'warglyph', gem: null } },
  }],
};

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

  it('StatSheet disables attribute steppers in read-only', () => {
    ro(<GearProgression />, buildWithGearAndArtifact);
    // Each of the 6 attributes has a decrease and increase button — all must be disabled
    const decButtons = screen.getAllByRole('button', { name: /^decrease /i });
    const incButtons = screen.getAllByRole('button', { name: /^increase /i });
    expect(decButtons.length).toBe(6);
    expect(incButtons.length).toBe(6);
    decButtons.forEach((b) => expect(b).toBeDisabled());
    incButtons.forEach((b) => expect(b).toBeDisabled());
    // Number inputs must be readOnly
    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach((inp) => expect(inp).toHaveAttribute('readonly'));
  });

  it('StatSheet enables attribute steppers when NOT read-only', () => {
    rw(<GearProgression />, buildWithGearAndArtifact);
    const decButtons = screen.getAllByRole('button', { name: /^decrease /i });
    const incButtons = screen.getAllByRole('button', { name: /^increase /i });
    decButtons.forEach((b) => expect(b).not.toBeDisabled());
    incButtons.forEach((b) => expect(b).not.toBeDisabled());
    const inputs = screen.getAllByRole('spinbutton');
    inputs.forEach((inp) => expect(inp).not.toHaveAttribute('readonly'));
  });

  it('ArtifactPanel disables artifact set and gem pickers in read-only', () => {
    ro(<GearProgression />, buildWithGearAndArtifact);
    // All "pick * set" buttons must be disabled
    const setButtons = screen.getAllByRole('button', { name: /^pick .+ set$/i });
    setButtons.forEach((b) => expect(b).toBeDisabled());
    // The rune slot has a set selected, so a "pick rune gem" button is rendered — must also be disabled
    const gemButtons = screen.getAllByRole('button', { name: /^pick .+ gem$/i });
    gemButtons.forEach((b) => expect(b).toBeDisabled());
  });

  it('ArtifactPanel enables artifact set and gem pickers when NOT read-only', () => {
    rw(<GearProgression />, buildWithGearAndArtifact);
    const setButtons = screen.getAllByRole('button', { name: /^pick .+ set$/i });
    setButtons.forEach((b) => expect(b).not.toBeDisabled());
    const gemButtons = screen.getAllByRole('button', { name: /^pick .+ gem$/i });
    gemButtons.forEach((b) => expect(b).not.toBeDisabled());
  });
});
