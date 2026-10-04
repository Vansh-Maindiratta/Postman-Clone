import { useEffect, useState } from 'react';
import type { Theme } from './types';
import { loadTheme, saveTheme } from './services/storage';
import Workspace from './pages/Workspace';

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => loadTheme() ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  return <Workspace theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} />;
}
