import { createContext, useContext } from 'react';
export const GameContext = createContext(null);
export function useGame() {
  return useContext(GameContext);
}
