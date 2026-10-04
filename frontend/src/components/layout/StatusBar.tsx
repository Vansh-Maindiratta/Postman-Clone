import type { ApiRequest } from '../../types';

interface StatusBarProps {
  request: ApiRequest | null;
  dirty: boolean;
  notice: { text: string; tone: 'info' | 'error' } | null;
}

const MOD = /Mac|iP(hone|ad|od)/.test(navigator.platform) ? '⌘' : 'Ctrl';

export default function StatusBar({ request, dirty, notice }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        {notice ? (
          <span className={`notice ${notice.tone}`} role="status">
            {notice.text}
          </span>
        ) : request ? (
          <>
            <span className="status-name">{request.name}</span>
            <span className={`status-flag${dirty ? ' unsaved' : ''}`}>{dirty ? 'Unsaved changes' : 'Saved'}</span>
          </>
        ) : (
          <span>No request open</span>
        )}
      </div>
      <div className="kbd-hints" aria-label="Keyboard shortcuts">
        <kbd>{MOD} ↵</kbd> Send
        <kbd>{MOD} S</kbd> Save
        <kbd>{MOD} K</kbd> Search
      </div>
    </footer>
  );
}
