import { useContext } from 'react';
import { ThemeContext, type ThemeApi } from '../components/layout/theme-context';

export function useTheme(): ThemeApi {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
