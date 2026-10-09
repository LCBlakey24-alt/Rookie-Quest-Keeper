import { Link } from 'react-router-dom';
import { exitReadOnlyDemo, isOfflineDesktop, isReadOnlyDemo, resetPreviewWorkspace } from './previewMode';

export default function PreviewWorkspaceControls() {
  const desktopOffline = isOfflineDesktop();
  const readOnlyDemo = isReadOnlyDemo();
  const reset = () => {
    if (window.confirm('Reset the sample campaign and characters? This clears only changes in this browser’s preview workspace.')) resetPreviewWorkspace();
  };

  return (
    <div className="rqk-preview-controls">
      <div>
        <strong>{desktopOffline ? 'Desktop offline' : readOnlyDemo ? 'Demo mode' : 'Preview workspace'}</strong>
        <span>{desktopOffline ? 'Saved only on this laptop · No internet required' : readOnlyDemo ? 'Sample data · Read-only · Nothing is saved' : 'Sample data · Changes stay in this browser'}</span>
      </div>
      <nav aria-label={desktopOffline ? 'Desktop tools' : readOnlyDemo ? 'Demo tools' : 'Preview tools'}>
        <Link to="/campaigns">Campaigns</Link>
        <Link to={desktopOffline ? '/characters' : '/player'}>{desktopOffline ? 'Characters' : 'Player pages'}</Link>
        {!desktopOffline && (readOnlyDemo
          ? <button type="button" onClick={() => exitReadOnlyDemo()}>Exit demo</button>
          : <button type="button" onClick={reset}>Reset preview</button>)}
      </nav>
    </div>
  );
}
