import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';
import type { ThemePreference } from './theme-context';

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};
const ICON: Record<ThemePreference, string> = {
  system: 'bx-desktop',
  light: 'bx-sun',
  dark: 'bx-moon',
};
const LABEL: Record<ThemePreference, string> = {
  system: 'Theme: follows device',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

/** Cycles system -> light -> dark; the label announces the current state. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <Button
      variant="ghost"
      icon={ICON[preference]}
      aria-label={`${LABEL[preference]}. Activate to change.`}
      title={LABEL[preference]}
      onClick={() => {
        setPreference(NEXT[preference]);
      }}
    />
  );
}
