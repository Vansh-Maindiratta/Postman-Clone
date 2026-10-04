import { useRef } from 'react';
import type { RefObject } from 'react';
import type { Theme } from '../../types';
import { IconDownload, IconMenu, IconMoon, IconPlus, IconSearch, IconSun, IconUpload } from '../ui/icons';

interface TopbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  theme: Theme;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onNewRequest: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
}

export default function Topbar({
  query,
  onQueryChange,
  searchRef,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onNewRequest,
  onImport,
  onExport,
}: TopbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onToggleSidebar} aria-label="Toggle collections panel">
        <IconMenu />
      </button>

      <div className="brand">
        <span className="brand-mark" />
        <span>
          API<span className="brand-accent">LAB</span>
        </span>
      </div>

      <div className="search-field">
        <IconSearch />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search requests..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Search requests"
        />
      </div>

      <div className="topbar-actions">
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <IconUpload />
          <span className="btn-label">Import</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = '';
          }}
        />
        <button type="button" className="btn btn-ghost" onClick={onExport}>
          <IconDownload />
          <span className="btn-label">Export</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={onNewRequest}>
          <IconPlus />
          New request
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  );
}
