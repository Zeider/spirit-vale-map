import { createContext, useContext, useReducer } from 'react';

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
      return { ...state, build: { ...state.build, attributes: { ...state.build.attributes, [action.key]: Math.max(1, action.value) } } };
    case 'hydrate': return { ...state, ...action.state };
    case 'setView': return { ...state, view: action.view };
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
      const stages = [...state.build.gearStages, { fromLevel: action.fromLevel, changes: {} }]
        .sort((a, b) => a.fromLevel - b.fromLevel);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.fromLevel === action.fromLevel) };
    }
    case 'removeGearStage': {
      const stages = state.build.gearStages.filter((_, i) => i !== action.index);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: Math.max(0, Math.min(state.selectedStage, stages.length - 1)) };
    }
    case 'setStageLevel': {
      const stages = state.build.gearStages.map((s, i) => (i === action.index ? { ...s, fromLevel: action.fromLevel } : s))
        .sort((a, b) => a.fromLevel - b.fromLevel);
      return { ...state, build: { ...state.build, gearStages: stages }, selectedStage: stages.findIndex((s) => s.fromLevel === action.fromLevel) };
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
    case 'selectStage': return { ...state, selectedStage: action.index };
    case 'selectItem': return { ...state, selectedItemSlug: action.slug };
    case 'selectItemSlot': return { ...state, openSlot: action.slot };
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
