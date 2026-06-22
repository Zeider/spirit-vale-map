import { createContext, useContext, useReducer } from 'react';
import { dependencyTargets } from '../logic/build.js';
import { sortStages, clampCap } from '../logic/gear.js';

export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
  view: 'atlas',
  build: { baseClass: null, advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } },
  selectedSkillId: null,
  selectedStage: 0,
  selectedItemSlug: null,
  openSlot: null,
  openPicker: null,
  gearOverlay: false,
  readOnly: false,
  galleryBuildId: null,
  shareLoading: false,
  authCallback: false,
  authError: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case 'setLevel': return { ...state, playerLevel: action.level };
    case 'setFilter': return { ...state, dropFilter: action.filter };
    case 'select': return { ...state, selectedZoneId: action.id };
    case 'addToRoute': {
      const idx = state.route.findIndex((e) => e.id === action.id);
      let route;
      if (idx === -1) route = [...state.route, { id: action.id, notes: '', wants: action.want ? [action.want] : [] }];
      else if (action.want && !state.route[idx].wants.includes(action.want)) {
        route = state.route.map((e, i) => (i === idx ? { ...e, wants: [...e.wants, action.want] } : e));
      } else route = state.route;
      return { ...state, route };
    }
    case 'removeFromRoute':
      return { ...state, route: state.route.filter((e) => e.id !== action.id) };
    case 'moveInRoute': {
      const r = [...state.route];
      const j = action.index + action.dir;
      if (j < 0 || j >= r.length) return state;
      [r[action.index], r[j]] = [r[j], r[action.index]];
      return { ...state, route: r };
    }
    case 'setZoneNotes':
      return { ...state, route: state.route.map((e) => (e.id === action.id ? { ...e, notes: action.notes } : e)) };
    case 'addZoneWant':
      return { ...state, route: state.route.map((e) => (e.id === action.id && !e.wants.includes(action.itemSlug) ? { ...e, wants: [...e.wants, action.itemSlug] } : e)) };
    case 'removeZoneWant':
      return { ...state, route: state.route.map((e) => (e.id === action.id ? { ...e, wants: e.wants.filter((w) => w !== action.itemSlug) } : e)) };
    case 'setBuildNotes':
      return { ...state, build: { ...state.build, notes: action.notes } };
    case 'setAttribute':
      return { ...state, build: { ...state.build, attributes: { ...state.build.attributes, [action.key]: Math.min(99, Math.max(1, Math.round(Number(action.value)) || 1)) } } };
    case 'hydrate': return { ...state, ...action.state };
    case 'setView': return { ...state, view: action.view };
    case 'setGalleryBuild': return { ...state, view: 'builds', galleryBuildId: action.id };
    case 'selectClass':
      return { ...state, build: { baseClass: action.slug, advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
    case 'selectAdvanced':
      return { ...state, build: { ...state.build, advancedClass: action.slug } };
    case 'setSkillLevel': {
      const levels = { ...state.build.levels };
      if (action.level > 0) levels[action.id] = action.level;
      else delete levels[action.id];
      return { ...state, build: { ...state.build, levels } };
    }
    case 'selectSkill': return { ...state, selectedSkillId: action.id };
    case 'resetBuild':
      return { ...state, build: { ...state.build, advancedClass: null, levels: {}, gearStages: [], notes: '', attributes: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 } }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
    case 'addGearStage': {
      const stages = sortStages([...state.build.gearStages, { toLevel: action.toLevel, changes: {} }]);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.toLevel === action.toLevel) };
    }
    case 'removeGearStage': {
      const stages = state.build.gearStages.filter((_, i) => i !== action.index);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: Math.max(0, Math.min(state.selectedStage, stages.length - 1)), openPicker: null };
    }
    case 'setStageCap': {
      const v = clampCap(state.build.gearStages, action.index, action.toLevel);
      const stages = sortStages(state.build.gearStages.map((s, i) => (i === action.index ? { ...s, toLevel: v } : s)));
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.toLevel === v) };
    }
    case 'setGearSlot': {
      const stages = state.build.gearStages.map((s, i) =>
        i === action.stageIndex ? { ...s, changes: { ...s.changes, [action.slot]: action.item } } : s);
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'clearGearSlot': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const changes = { ...s.changes };
        delete changes[action.slot];
        return { ...s, changes };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'selectStage': return { ...state, selectedStage: action.index, openPicker: null };
    case 'openGearEditor': return { ...state, gearOverlay: true, openPicker: null, openSlot: null, selectedStage: action.index ?? state.selectedStage };
    case 'closeGearEditor': return { ...state, gearOverlay: false, openPicker: null, openSlot: null };
    case 'selectItem': return { ...state, selectedItemSlug: action.slug };
    case 'selectItemSlot': return { ...state, openSlot: action.slot };
    case 'setPicker': return { ...state, openPicker: action.picker };
    case 'incrementSkill': {
      const targets = dependencyTargets(action.id, state.build);
      return { ...state, build: { ...state.build, levels: { ...state.build.levels, ...targets } } };
    }
    case 'setCardSlot': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const cards = { ...(s.cards || {}) };
        const arr = [...(cards[action.slot] || [])];
        arr[action.index] = action.card;
        cards[action.slot] = arr;
        return { ...s, cards };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'setArtifact': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const artifacts = { ...(s.artifacts || {}) };
        if (action.set == null) artifacts[action.atype] = null;
        else artifacts[action.atype] = { set: action.set, gem: artifacts[action.atype]?.gem ?? null };
        return { ...s, artifacts };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    case 'setArtifactGem': {
      const stages = state.build.gearStages.map((s, i) => {
        if (i !== action.stageIndex) return s;
        const cur = (s.artifacts || {})[action.atype];
        if (!cur?.set) return s;
        const artifacts = { ...(s.artifacts || {}), [action.atype]: { ...cur, gem: action.gem } };
        return { ...s, artifacts };
      });
      return { ...state, build: { ...state.build, gearStages: stages } };
    }
    default: return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children, init }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...init });
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
