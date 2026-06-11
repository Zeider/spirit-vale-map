import { createContext, useContext, useReducer } from 'react';

export const initialState = {
  playerLevel: 1,
  dropFilter: 'all',
  selectedZoneId: null,
  route: [],
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
