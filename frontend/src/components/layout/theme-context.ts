import { createContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeApi {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeApi | null>(null);
