import { createContext, useContext, useReducer } from 'react';

export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
  view: 'atlas',
  build: { baseClass: null, advancedClass: null, levels: {}, gearStages: [] },
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
    case 'addToRoute':
      return state.route.includes(action.id) ? state : { ...state, route: [...state.route, action.id] };
    case 'removeFromRoute':
      return { ...state, route: state.route.filter((id) => id !== action.id) };
    case 'moveInRoute': {
      const r = [...state.route];
      const { index, dir } = action;
      const j = index + dir;
      if (j < 0 || j >= r.length) return state;
      [r[index], r[j]] = [r[j], r[index]];
      return { ...state, route: r };
    }
    case 'hydrate': return { ...state, ...action.state };
    case 'setView': return { ...state, view: action.view };
    case 'selectClass':
      return { ...state, build: { baseClass: action.slug, advancedClass: null, levels: {}, gearStages: [] }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
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
      return { ...state, build: { ...state.build, advancedClass: null, levels: {}, gearStages: [] }, selectedSkillId: null, selectedStage: 0, selectedItemSlug: null };
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
